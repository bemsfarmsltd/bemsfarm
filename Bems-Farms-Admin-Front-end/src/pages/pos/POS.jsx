import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// ── Data ─────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',        label: 'All Items',     emoji: '🛒' },
  { id: 'meals',      label: 'Meals',         emoji: '🍲' },
  { id: 'seafood',    label: 'Seafood',        emoji: '🐟' },
  { id: 'meat',       label: 'Meat',           emoji: '🥩' },
  { id: 'grains',     label: 'Grains & Carbs', emoji: '🌾' },
  { id: 'vegetables', label: 'Vegetables',     emoji: '🥬' },
  { id: 'dairy',      label: 'Dairy & Eggs',   emoji: '🥛' },
  { id: 'beverages',  label: 'Beverages',      emoji: '🥤' },
  { id: 'farm',       label: 'Fresh Farm',     emoji: '🌱' },
]
const CAT_COLORS = {
  meals:'#0ab39c', seafood:'#299cdb', meat:'#f06548',
  grains:'#f7b84b', vegetables:'#4ade80', dairy:'#a78bfa',
  beverages:'#38bdf8', farm:'#22c55e', all:'#405189',
}
const PRODUCTS = [
  { id:1,  barcode:'BF-MEAL-001', sku:'MEAL-001', name:'Jollof Rice Box',         cat:'meals',      price:3500, icon:'🍚', stock:24, unit:'pack'   },
  { id:2,  barcode:'BF-MEAL-002', sku:'MEAL-002', name:'Egusi Soup (Medium Pot)', cat:'meals',      price:2800, icon:'🫕', stock:18, unit:'pot'    },
  { id:3,  barcode:'BF-MEAL-003', sku:'MEAL-003', name:'Fried Rice & Chicken',    cat:'meals',      price:4200, icon:'🍗', stock:15, unit:'pack'   },
  { id:4,  barcode:'BF-MEAL-004', sku:'MEAL-004', name:'Pounded Yam + Egusi',     cat:'meals',      price:3800, icon:'🍽️', stock:12, unit:'plate'  },
  { id:5,  barcode:'BF-MEAL-005', sku:'MEAL-005', name:'Pepper Soup (Goat)',      cat:'meals',      price:5000, icon:'🍜', stock:8,  unit:'bowl'   },
  { id:6,  barcode:'BF-MEAL-006', sku:'MEAL-006', name:'Ofada Rice + Stew',       cat:'meals',      price:3200, icon:'🍛', stock:20, unit:'pack'   },
  { id:7,  barcode:'BF-MEAL-007', sku:'MEAL-007', name:'Banga Soup',              cat:'meals',      price:3200, icon:'🥣', stock:10, unit:'pot'    },
  { id:8,  barcode:'BF-MEAL-008', sku:'MEAL-008', name:'Afang Soup',              cat:'meals',      price:3500, icon:'🥗', stock:14, unit:'pot'    },
  { id:9,  barcode:'BF-FSH-001',  sku:'FSH-001',  name:'Fresh Tilapia (1 kg)',    cat:'seafood',    price:3000, icon:'🐟', stock:30, unit:'kg'     },
  { id:10, barcode:'BF-FSH-002',  sku:'FSH-002',  name:'Catfish (1 kg)',           cat:'seafood',    price:3500, icon:'🐠', stock:25, unit:'kg'     },
  { id:11, barcode:'BF-FSH-003',  sku:'FSH-003',  name:'Smoked Mackerel',          cat:'seafood',    price:1800, icon:'🐡', stock:40, unit:'piece'  },
  { id:12, barcode:'BF-FSH-004',  sku:'FSH-004',  name:'Dried Stockfish',          cat:'seafood',    price:2500, icon:'🦈', stock:35, unit:'piece'  },
  { id:13, barcode:'BF-FSH-005',  sku:'FSH-005',  name:'Tiger Prawns (500 g)',     cat:'seafood',    price:4500, icon:'🦐', stock:20, unit:'pack'   },
  { id:14, barcode:'BF-FSH-006',  sku:'FSH-006',  name:'Crayfish (200 g)',         cat:'seafood',    price:1500, icon:'🦞', stock:50, unit:'pack'   },
  { id:15, barcode:'BF-MT-001',   sku:'MT-001',   name:'Goat Meat (1 kg)',         cat:'meat',       price:5500, icon:'🥩', stock:22, unit:'kg'     },
  { id:16, barcode:'BF-MT-002',   sku:'MT-002',   name:'Chicken (1 kg)',            cat:'meat',       price:3800, icon:'🍗', stock:28, unit:'kg'     },
  { id:17, barcode:'BF-MT-003',   sku:'MT-003',   name:'Beef (1 kg)',               cat:'meat',       price:5000, icon:'🥓', stock:18, unit:'kg'     },
  { id:18, barcode:'BF-MT-004',   sku:'MT-004',   name:'Turkey (1 kg)',             cat:'meat',       price:4500, icon:'🦃', stock:12, unit:'kg'     },
  { id:19, barcode:'BF-GRN-001',  sku:'GRN-001',  name:'Rice (5 kg bag)',           cat:'grains',     price:6500, icon:'🌾', stock:60, unit:'bag'    },
  { id:20, barcode:'BF-GRN-002',  sku:'GRN-002',  name:'Beans (2 kg)',              cat:'grains',     price:2200, icon:'🫘', stock:45, unit:'bag'    },
  { id:21, barcode:'BF-GRN-003',  sku:'GRN-003',  name:'Yam (1 tuber)',             cat:'grains',     price:1500, icon:'🍠', stock:35, unit:'tuber'  },
  { id:22, barcode:'BF-GRN-004',  sku:'GRN-004',  name:'Plantain (bunch)',          cat:'grains',     price:1200, icon:'🍌', stock:40, unit:'bunch'  },
  { id:23, barcode:'BF-GRN-005',  sku:'GRN-005',  name:'Semolina (1 kg)',           cat:'grains',     price:1200, icon:'🫙', stock:55, unit:'kg'     },
  { id:24, barcode:'BF-VEG-001',  sku:'VEG-001',  name:'Tomatoes (1 kg)',           cat:'vegetables', price:800,  icon:'🍅', stock:3,  unit:'kg'     },
  { id:25, barcode:'BF-VEG-002',  sku:'VEG-002',  name:'Spinach / Efo Tete',        cat:'vegetables', price:500,  icon:'🥬', stock:2,  unit:'bunch'  },
  { id:26, barcode:'BF-VEG-003',  sku:'VEG-003',  name:'Ugu / Pumpkin Leaf',        cat:'vegetables', price:600,  icon:'🌿', stock:15, unit:'bunch'  },
  { id:27, barcode:'BF-VEG-004',  sku:'VEG-004',  name:'Scotch Bonnet (500 g)',     cat:'vegetables', price:700,  icon:'🌶️', stock:20, unit:'pack'   },
  { id:28, barcode:'BF-VEG-005',  sku:'VEG-005',  name:'Onions (1 kg)',             cat:'vegetables', price:600,  icon:'🧅', stock:30, unit:'kg'     },
  { id:29, barcode:'BF-EGG-001',  sku:'EGG-001',  name:'Organic Eggs (crate/30)',   cat:'dairy',      price:6000, icon:'🥚', stock:6,  unit:'crate'  },
  { id:30, barcode:'BF-DRY-001',  sku:'DRY-001',  name:'Fresh Whole Milk (1 L)',    cat:'dairy',      price:1500, icon:'🥛', stock:18, unit:'litre'  },
  { id:31, barcode:'BF-DRY-002',  sku:'DRY-002',  name:'Greek Yogurt (500 g)',      cat:'dairy',      price:2500, icon:'🍦', stock:12, unit:'pack'   },
  { id:32, barcode:'BF-DRY-003',  sku:'DRY-003',  name:'Butter (250 g)',            cat:'dairy',      price:2000, icon:'🧈', stock:20, unit:'pack'   },
  { id:33, barcode:'BF-BEV-001',  sku:'BEV-001',  name:'Zobo Drink (1 L)',          cat:'beverages',  price:800,  icon:'🧃', stock:30, unit:'bottle' },
  { id:34, barcode:'BF-BEV-002',  sku:'BEV-002',  name:'Kunu (500 ml)',             cat:'beverages',  price:600,  icon:'🥤', stock:25, unit:'bottle' },
  { id:35, barcode:'BF-BEV-003',  sku:'BEV-003',  name:'Bottled Water (1.5 L)',     cat:'beverages',  price:400,  icon:'💧', stock:100,unit:'bottle' },
  { id:36, barcode:'BF-BEV-004',  sku:'BEV-004',  name:'Tigernut Milk (500 ml)',    cat:'beverages',  price:1200, icon:'🍶', stock:15, unit:'bottle' },
  { id:37, barcode:'BF-BEV-005',  sku:'BEV-005',  name:'Fresh Orange Juice (500ml)',cat:'beverages',  price:1200, icon:'🍊', stock:20, unit:'bottle' },
  { id:38, barcode:'BF-FRM-001',  sku:'FRM-001',  name:'Ginger (250 g)',            cat:'farm',       price:400,  icon:'🫚', stock:40, unit:'pack'   },
  { id:39, barcode:'BF-FRM-002',  sku:'FRM-002',  name:'Garlic (5 bulbs)',          cat:'farm',       price:600,  icon:'🧄', stock:35, unit:'pack'   },
  { id:40, barcode:'BF-FRM-003',  sku:'FRM-003',  name:'Sweet Potatoes (1 kg)',     cat:'farm',       price:700,  icon:'🍠', stock:28, unit:'kg'     },
  { id:41, barcode:'BF-FRM-004',  sku:'FRM-004',  name:'Cassava (1 kg)',            cat:'farm',       price:500,  icon:'🪴', stock:50, unit:'kg'     },
  { id:42, barcode:'BF-FRM-005',  sku:'FRM-005',  name:'Fresh Herb Bundle',         cat:'farm',       price:600,  icon:'🌱', stock:20, unit:'bunch'  },
]
const BY_BARCODE = {}; const BY_SKU = {}
PRODUCTS.forEach(p => { BY_BARCODE[p.barcode] = p; BY_SKU[p.sku] = p })

const MOCK_CUSTOMERS = [
  { id:1, name:'Amara Obi',      phone:'0810 000 1234', tier:'Platinum', points:2450, wallet:5000,  orders:24 },
  { id:2, name:'Tunde Adeyemi',  phone:'0802 345 6789', tier:'Gold',     points:1200, wallet:1200,  orders:12 },
  { id:3, name:'Mrs. Okonkwo',   phone:'0706 789 0123', tier:'Platinum', points:3800, wallet:8500,  orders:38 },
  { id:4, name:'Kemi Balogun',   phone:'0817 234 5678', tier:'Silver',   points:620,  wallet:0,     orders:4  },
  { id:5, name:'Seun Abiodun',   phone:'0803 456 7890', tier:'Gold',     points:1700, wallet:3000,  orders:17 },
]
const HISTORY_MOCK = [
  { inv:'BF-INV-1023', cust:'Walk-in',     method:'Cash',     time:'10:45 AM', amount:3500  },
  { inv:'BF-INV-1024', cust:'Amara Obi',   method:'Transfer', time:'11:10 AM', amount:14200 },
  { inv:'BF-INV-1025', cust:'Mrs. Okonkwo',method:'Card/POS', time:'12:05 PM', amount:8750  },
  { inv:'BF-INV-1026', cust:'Walk-in',     method:'Cash',     time:'01:20 PM', amount:2400  },
  { inv:'BF-INV-1027', cust:'Tunde Adeyemi',method:'QR/USSD', time:'02:05 PM', amount:6600  },
  { inv:'BF-INV-1028', cust:'Kemi Balogun',method:'Card/POS', time:'02:40 PM', amount:5100  },
]
// ── Online / Incoming Orders ─────────────────────────────────────────────────
const ONLINE_ORDERS = [
  {
    id:'ORD-WEB-4421', channel:'website', customer:'Amara Obi', phone:'0810 000 1234',
    time:'09:14 AM', status:'new', note:'Please pack neatly, delivery by 12pm',
    items:[
      { productId:1,  qty:2 },   // Jollof Rice Box × 2
      { productId:35, qty:4 },   // Bottled Water × 4
      { productId:9,  qty:1 },   // Fresh Tilapia × 1
    ],
  },
  {
    id:'ORD-WA-4422', channel:'whatsapp', customer:'Mrs. Okonkwo', phone:'0706 789 0123',
    time:'10:02 AM', status:'new', note:'',
    items:[
      { productId:2, qty:1 },    // Egusi Soup × 1
      { productId:4, qty:1 },    // Pounded Yam × 1
      { productId:33,qty:2 },    // Zobo Drink × 2
    ],
  },
  {
    id:'ORD-IG-4423', channel:'instagram', customer:'Kemi Balogun', phone:'0817 234 5678',
    time:'10:45 AM', status:'pending', note:'Call before dispatch',
    items:[
      { productId:16, qty:2 },   // Chicken 1kg × 2
      { productId:19, qty:1 },   // Rice 5kg × 1
      { productId:28, qty:1 },   // Onions 1kg × 1
    ],
  },
  {
    id:'ORD-WEB-4424', channel:'website', customer:'Tunde Adeyemi', phone:'0802 345 6789',
    time:'11:30 AM', status:'pending', note:'',
    items:[
      { productId:13, qty:2 },   // Tiger Prawns × 2
      { productId:15, qty:1 },   // Goat Meat × 1
      { productId:37, qty:3 },   // Fresh OJ × 3
    ],
  },
  {
    id:'ORD-WA-4425', channel:'whatsapp', customer:'Seun Abiodun', phone:'0803 456 7890',
    time:'12:10 PM', status:'new', note:'Add extra pepper please',
    items:[
      { productId:3, qty:3 },    // Fried Rice & Chicken × 3
      { productId:33,qty:6 },    // Zobo Drink × 6
    ],
  },
  {
    id:'ORD-PHN-4426', channel:'phone', customer:'Walk-in Pickup', phone:'—',
    time:'12:55 PM', status:'processing', note:'Paid online, just for pickup',
    items:[
      { productId:5,  qty:1 },   // Pepper Soup × 1
      { productId:22, qty:2 },   // Plantain × 2
      { productId:35, qty:2 },   // Water × 2
    ],
  },
]
const CHANNEL_META = {
  website:   { label:'Website',   icon:'ri-global-line',     color:'#405189' },
  whatsapp:  { label:'WhatsApp',  icon:'ri-whatsapp-line',   color:'#25d366' },
  instagram: { label:'Instagram', icon:'ri-instagram-line',  color:'#e1306c' },
  phone:     { label:'Phone',     icon:'ri-phone-line',      color:'#f7b84b' },
}
const STATUS_META = {
  new:        { label:'New',        color:'#0ab39c', bg:'rgba(10,179,156,.12)' },
  pending:    { label:'Pending',    color:'#f7b84b', bg:'rgba(247,184,75,.12)' },
  processing: { label:'Processing', color:'#299cdb', bg:'rgba(41,156,219,.12)' },
}

const TIER_COLOR = { Platinum:'#a78bfa', Gold:'#f7b84b', Silver:'#94a3b8', Bronze:'#f97316' }
const fmt  = n => '₦' + Math.round(n).toLocaleString()
const genOrderId = () => 'BF-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5)

// ── Component ─────────────────────────────────────────────────────────────────
export default function POS() {
  const { user } = useAuth()

  // UI
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch]             = useState('')
  const [toast, setToast]               = useState(null)
  const [toastTimer, setToastTimer]     = useState(null)

  // Online orders
  const [onlineOrders, setOnlineOrders] = useState(ONLINE_ORDERS)
  const [onlineFilter, setOnlineFilter] = useState('all')   // 'all'|'new'|'pending'|'processing'
  const [expandedOrder, setExpandedOrder] = useState(null)  // order id being previewed

  // Customer
  const [customer, setCustomer]         = useState(null)
  const [custSearch, setCustSearch]     = useState('')
  const [showCustPanel, setShowCustPanel] = useState(false)

  // Cart
  const [cart, setCart]                 = useState([])
  const [discountPct, setDiscountPct]   = useState(0)
  const [orderNote, setOrderNote]       = useState('')
  const [highlightId, setHighlightId]   = useState(null)

  // Held orders
  const [heldOrders, setHeldOrders]     = useState([])
  const [orderId, setOrderId]           = useState(genOrderId)

  // ── Modals (one at a time) ────────────────────────────────────────────────
  // null | 'cash' | 'card' | 'qr' | 'transfer' | 'split'
  // | 'hold' | 'invoice' | 'paylater' | 'history' | 'success' | 'scanner'
  const [activeModal, setActiveModal]   = useState(null)
  const closeModal = () => setActiveModal(null)

  // Scanner basket modal
  const [scanCart, setScanCart]         = useState([])
  const [scanCode, setScanCode]         = useState('')
  const scanModalInputRef               = useRef(null)

  // Cash modal
  const [cashReceived, setCashReceived] = useState('')
  // Card modal
  const [cardTab, setCardTab]           = useState('visa') // 'visa' | 'mastercard'
  const [cardNum, setCardNum]           = useState('')
  const [cardExpiry, setCardExpiry]     = useState('')
  const [cardCvv, setCardCvv]           = useState('')
  const [cardTxnId, setCardTxnId]       = useState('')
  const [cardNote, setCardNote]         = useState('')
  // Transfer modal
  const [bankName, setBankName]         = useState('')
  const [txnRef, setTxnRef]             = useState('')
  const [transferDate, setTransferDate] = useState('')
  // Split modal
  const [splitRows, setSplitRows]       = useState([
    { method:'Cash',     amount:'' },
    { method:'Transfer', amount:'' },
  ])
  // Hold modal
  const [holdRef, setHoldRef]           = useState('')
  const [holdNote, setHoldNote]         = useState('')
  // Pay later modal
  const [payLaterCust, setPayLaterCust] = useState('')
  const [payLaterDate, setPayLaterDate] = useState('')
  // Success data
  const [successData, setSuccessData]   = useState(null)

  // Goods Return modal
  const POS_RETURN_REASONS = ['Damaged on delivery','Wrong item sent','Quality below standard','Spoiled / Already expired','Item missing from order','Incorrect quantity','Customer changed mind','Packaging damaged']
  const [returnForm, setReturnForm] = useState({
    customer:'Walk-in', phone:'', product:PRODUCTS[0], qty:1, unitPrice:PRODUCTS[0].price,
    reason:POS_RETURN_REASONS[0], notes:'', condition:'resalable', refundMethod:'Cash',
  })
  const [returnStep, setReturnStep]     = useState(1)  // 1=details 2=inspect+refund
  const [returnLogs, setReturnLogs]     = useState([])
  const [returnSuccess, setReturnSuccess] = useState(null)

  const scanInputRef = useRef(null)

  // ── Barcode scanner ───────────────────────────────────────────────────────
  const scanBuffer  = useRef('')
  const lastKeyTime = useRef(0)
  const onScanRef   = useRef(null)

  const handleBarcodeScan = useCallback((code) => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    const product = BY_BARCODE[trimmed] || BY_BARCODE['BF-' + trimmed] || BY_SKU[trimmed]
    if (!product) { showToast('Not found: ' + trimmed, 'error', '❌'); return }
    addProductToCart(product)
    setSearch('')
    if (scanInputRef.current) scanInputRef.current.focus()
  }, [])
  onScanRef.current = handleBarcodeScan

  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName?.toLowerCase()
      const id  = document.activeElement?.id
      if ((tag === 'input' || tag === 'textarea') && id !== 'scan-field') return
      const now = Date.now()
      if (e.key === 'Enter') {
        if (scanBuffer.current.length >= 3) onScanRef.current(scanBuffer.current)
        scanBuffer.current = ''; return
      }
      if (e.key.length === 1) {
        if (now - lastKeyTime.current > 300) scanBuffer.current = ''
        scanBuffer.current += e.key; lastKeyTime.current = now
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    document.body.classList.add('sidebar-hidden')
    return () => document.body.classList.remove('sidebar-hidden')
  }, [])

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg, type = 'success', icon = '✅') {
    if (toastTimer) clearTimeout(toastTimer)
    setToast({ msg, type, icon })
    setToastTimer(setTimeout(() => setToast(null), 2500))
  }

  // ── Cart helpers ──────────────────────────────────────────────────────────
  function addProductToCart(product) {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) {
        showToast(`${product.name} · qty ${ex.qty + 1}`, 'success', product.icon)
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      showToast(`${product.name} added`, 'success', product.icon)
      return [...prev, { ...product, qty: 1, note: '' }]
    })
    setHighlightId(product.id); setTimeout(() => setHighlightId(null), 700)
  }
  function updateQty(id, qty) {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.id !== id)); return }
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }
  function updateNote(id, note) { setCart(prev => prev.map(i => i.id === id ? { ...i, note } : i)) }
  function clearCart() {
    setCart([]); setDiscountPct(0); setOrderNote(''); setCustomer(null); setOrderId(genOrderId())
  }

  // ── Scanner basket helpers ────────────────────────────────────────────────
  function scannerAddProduct(code) {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    const product = BY_BARCODE[trimmed] || BY_BARCODE['BF-' + trimmed] || BY_SKU[trimmed]
    if (!product) { showToast('Not found: ' + trimmed, 'error', '❌'); return }
    setScanCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })
    showToast(`${product.name} scanned`, 'success', product.icon)
    setScanCode('')
    setTimeout(() => scanModalInputRef.current?.focus(), 50)
  }
  function scannerUpdateQty(id, qty) {
    if (qty <= 0) { setScanCart(prev => prev.filter(i => i.id !== id)); return }
    setScanCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }
  function scannerAddToOrder() {
    // Merge scanCart into main cart
    scanCart.forEach(item => {
      setCart(prev => {
        const ex = prev.find(i => i.id === item.id)
        if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + item.qty } : i)
        return [...prev, { ...item, note: '' }]
      })
    })
    showToast(`${scanCart.length} item(s) added to order`, 'success', '🛒')
    setScanCart([])
    closeModal()
  }
  function scannerQuickPay() {
    // Merge scanCart into main cart, then open cash modal
    scanCart.forEach(item => {
      setCart(prev => {
        const ex = prev.find(i => i.id === item.id)
        if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + item.qty } : i)
        return [...prev, { ...item, note: '' }]
      })
    })
    setScanCart([])
    setTimeout(() => setActiveModal('cash'), 50)
  }

  // ── Online order → cart ───────────────────────────────────────────────────
  function loadOnlineOrderToCart(order) {
    let loaded = 0
    order.items.forEach(({ productId, qty }) => {
      const product = PRODUCTS.find(p => p.id === productId)
      if (!product) return
      setCart(prev => {
        const ex = prev.find(i => i.id === product.id)
        if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + qty } : i)
        return [...prev, { ...product, qty, note: '' }]
      })
      loaded++
    })
    // Match customer if found
    const matched = MOCK_CUSTOMERS.find(c => c.name === order.customer)
    if (matched) setCustomer(matched)
    // Mark order as processing
    setOnlineOrders(prev => prev.map(o => o.id === order.id ? { ...o, status:'processing' } : o))
    showToast(`${loaded} item(s) from ${order.id} loaded to cart`, 'success', '📥')
    closeModal()
  }

  // ── Hold ──────────────────────────────────────────────────────────────────
  function doHold() {
    if (cart.length === 0) return
    setHeldOrders(prev => [...prev, { orderId, cart, customer, discountPct, orderNote, ref: holdRef, note: holdNote }])
    showToast(`Order held · ref: ${holdRef || orderId}`, 'info', '⏸️')
    setHoldRef(''); setHoldNote(''); closeModal(); clearCart()
  }
  function recallOrder(idx) {
    const held = heldOrders[idx]
    if (cart.length > 0) setHeldOrders(prev => [...prev, { orderId, cart, customer, discountPct, orderNote }])
    setCart(held.cart); setCustomer(held.customer); setDiscountPct(held.discountPct)
    setOrderNote(held.orderNote); setOrderId(held.orderId)
    setHeldOrders(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal    = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const discountAmt = Math.round(subtotal * discountPct / 100)
  const taxable     = subtotal - discountAmt
  const vat         = Math.round(taxable * 0.075)
  const total       = taxable + vat
  const itemCount   = cart.reduce((s, i) => s + i.qty, 0)
  const cashChange  = cashReceived ? Math.max(0, Number(cashReceived) - total) : 0

  // ── Confirm payment ───────────────────────────────────────────────────────
  function confirmPayment(method) {
    setSuccessData({ orderId, customer, cart: [...cart], subtotal, discountAmt, vat, total, discountPct, method, paidAt: new Date() })
    closeModal()
    setTimeout(() => setActiveModal('success'), 80)
  }
  function newOrder() { closeModal(); clearCart(); setCashReceived('') }

  // ── Numpad (cash modal) ───────────────────────────────────────────────────
  function numpadPress(v) {
    setCashReceived(prev => {
      if (v === '⌫') return prev.slice(0, -1)
      if (v === 'C') return ''
      if (v === '.' && prev.includes('.')) return prev
      return prev + v
    })
  }

  // ── Products ──────────────────────────────────────────────────────────────
  const products = useMemo(() => {
    let list = activeCategory === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.cat === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q))
    }
    return list
  }, [activeCategory, search])

  const filteredCustomers = custSearch.trim()
    ? MOCK_CUSTOMERS.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.phone.includes(custSearch))
    : MOCK_CUSTOMERS

  // ── Clock ─────────────────────────────────────────────────────────────────
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 10000); return () => clearInterval(t) }, [])

  // ── Split helpers ─────────────────────────────────────────────────────────
  function addSplitRow() { setSplitRows(r => [...r, { method:'Cash', amount:'' }]) }
  function updateSplit(i, field, val) { setSplitRows(r => r.map((row, ri) => ri === i ? { ...row, [field]: val } : row)) }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bs-body-bg)', color:'var(--bs-body-color)' }}>

      {/* ═══ TOPBAR ═══════════════════════════════════════════════════════ */}
      <header className="border-bottom" style={{ height:58, flexShrink:0, display:'flex', alignItems:'center', padding:'0 16px', zIndex:200, background:'var(--bs-body-bg)' }}>
        {/* Logo — left */}
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, fontWeight:800, fontSize:15, color:'#0ab39c' }}>
          <span style={{ fontSize:24 }}>🌾</span>
          <span>Bems Farms<br/><span style={{ fontSize:9, fontWeight:500, color:'var(--bs-secondary-color)', letterSpacing:1 }}>POINT OF SALE</span></span>
        </div>
        {/* Unified search + scanner — truly centred */}
        <div style={{ position:'relative', width:'100%', maxWidth:520 }}>
          <i className="ri-search-line" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#0ab39c', fontSize:15, pointerEvents:'none' }}></i>
          <input
            id="scan-field"
            ref={scanInputRef}
            type="text"
            placeholder="Search products  ·  or scan / type barcode + Enter"
            autoComplete="off"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && search.trim()) handleBarcodeScan(search) }}
            style={{ width:'100%', height:38, paddingLeft:38, paddingRight:96, border:'2px solid #0ab39c', borderRadius:8, fontSize:13, background:'var(--bs-body-bg)', color:'var(--bs-body-color)', outline:'none', boxShadow:'0 0 0 3px rgba(10,179,156,.1)' }}
          />
          {search
            ? <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--bs-secondary-color)', fontSize:16 }}>✕</button>
            : <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:9, color:'#0ab39c', fontWeight:700, letterSpacing:.5, pointerEvents:'none' }}>SCANNER READY</span>
          }
        </div>
        {/* Right controls */}
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
          <div style={{ fontSize:12, color:'var(--bs-secondary-color)', textAlign:'right' }}>
            <div style={{ fontWeight:600 }}>{now.toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'})}</div>
            <div style={{ fontSize:10 }}>{now.toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})}</div>
          </div>
          {heldOrders.length > 0 && (
            <button className="btn btn-warning btn-sm px-2" style={{ fontSize:11 }}>⏸️ {heldOrders.length} Held</button>
          )}
          <Link to="/dashboard" className="btn btn-sm btn-secondary" style={{ fontSize:12 }}><i className="ri-dashboard-2-line me-1"></i>Exit</Link>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'#0ab39c', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:12 }}>
            {user ? (user.first_name?.[0]||'') + (user.last_name?.[0]||'') : 'AS'}
          </div>
        </div>
      </header>

      {/* ═══ BODY ══════════════════════════════════════════════════════════ */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', background:'var(--bs-body-bg)' }}>

        {/* ── LEFT: Products ─────────────────────────────────────────────── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', borderRight:'1px solid var(--bs-border-color)', background:'var(--bs-body-bg)' }}>
          {/* ── Quick Action Cards: Scan Basket + Online Orders ─────────── */}
          <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--bs-border-color)', background:'var(--bs-body-secondary-bg)', flexShrink:0, display:'flex', gap:10 }}>

            {/* Scan Basket */}
            <button
              onClick={() => { setScanCart([]); setScanCode(''); setActiveModal('scanner') }}
              style={{ flex:1, display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:14, border:'1px solid rgba(10,179,156,.25)', background:'var(--bs-body-bg)', cursor:'pointer', textAlign:'left', boxShadow:'0 2px 8px rgba(10,179,156,.12)', transition:'box-shadow .2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(10,179,156,.22)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='0 2px 8px rgba(10,179,156,.12)'}>
              <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#0ab39c,#2ec4b0)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(10,179,156,.35)' }}>
                <i className="ri-barcode-line" style={{ fontSize:22, color:'#fff' }}></i>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--bs-body-color)', letterSpacing:.2 }}>Scan Basket</div>
                <div style={{ fontSize:11, color:'var(--bs-secondary-color)', marginTop:2 }}>Scan barcodes to build order</div>
              </div>
              {scanCart.length > 0
                ? <span style={{ background:'#0ab39c', color:'#fff', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, flexShrink:0 }}>{scanCart.length}</span>
                : <i className="ri-arrow-right-s-line" style={{ fontSize:18, color:'#0ab39c', flexShrink:0 }}></i>
              }
            </button>

            {/* Online Orders */}
            {(() => {
              const newCount = onlineOrders.filter(o => o.status === 'new').length
              return (
                <button
                  onClick={() => setActiveModal('online')}
                  style={{ flex:1, display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:14, border:'1px solid rgba(64,81,137,.25)', background:'var(--bs-body-bg)', cursor:'pointer', textAlign:'left', boxShadow:'0 2px 8px rgba(64,81,137,.12)', transition:'box-shadow .2s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(64,81,137,.22)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow='0 2px 8px rgba(64,81,137,.12)'}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#405189,#5a6fc4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(64,81,137,.35)' }}>
                    <i className="ri-shopping-bag-3-line" style={{ fontSize:22, color:'#fff' }}></i>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'var(--bs-body-color)', letterSpacing:.2 }}>Online Orders</div>
                    <div style={{ fontSize:11, color:'var(--bs-secondary-color)', marginTop:2 }}>Import incoming orders to cart</div>
                  </div>
                  {newCount > 0
                    ? <span style={{ background:'#f06548', color:'#fff', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, flexShrink:0 }}>{newCount} new</span>
                    : <i className="ri-arrow-right-s-line" style={{ fontSize:18, color:'#405189', flexShrink:0 }}></i>
                  }
                </button>
              )
            })()}

            {/* Goods Return */}
            <button
              onClick={() => { setReturnForm(f=>({...f,product:PRODUCTS[0],unitPrice:PRODUCTS[0].price,qty:1,customer:'Walk-in',phone:'',notes:'',condition:'resalable',refundMethod:'Cash',reason:POS_RETURN_REASONS[0]})); setReturnStep(1); setReturnSuccess(null); setActiveModal('return') }}
              style={{ flex:1, display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:14, border:'1px solid rgba(240,101,72,.25)', background:'var(--bs-body-bg)', cursor:'pointer', textAlign:'left', boxShadow:'0 2px 8px rgba(240,101,72,.12)', transition:'box-shadow .2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(240,101,72,.22)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='0 2px 8px rgba(240,101,72,.12)'}>
              <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#f06548,#e04b2f)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(240,101,72,.35)' }}>
                <i className="ri-arrow-go-back-line" style={{ fontSize:22, color:'#fff' }}></i>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--bs-body-color)', letterSpacing:.2 }}>Goods Return</div>
                <div style={{ fontSize:11, color:'var(--bs-secondary-color)', marginTop:2 }}>Process a customer return &amp; refund</div>
              </div>
              {returnLogs.length > 0
                ? <span style={{ background:'#f06548', color:'#fff', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, flexShrink:0 }}>{returnLogs.length}</span>
                : <i className="ri-arrow-right-s-line" style={{ fontSize:18, color:'#f06548', flexShrink:0 }}></i>
              }
            </button>
          </div>

          {/* Category pills */}
          <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--bs-border-color)', display:'flex', gap:6, overflowX:'auto', flexShrink:0, scrollbarWidth:'none', background:'var(--bs-body-bg)' }}>
            {CATEGORIES.map(cat => {
              const active = activeCategory === cat.id; const color = CAT_COLORS[cat.id]
              return (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, border:`2px solid ${active ? color : 'var(--bs-border-color)'}`, background: active ? color : 'transparent', color: active ? '#fff' : 'var(--bs-body-color)', fontSize:12, fontWeight:600, whiteSpace:'nowrap', cursor:'pointer', flexShrink:0 }}>
                  <span style={{ fontSize:15 }}>{cat.emoji}</span> {cat.label}
                </button>
              )
            })}
          </div>

          {/* Grid */}
          <div style={{ flex:1, overflowY:'auto', padding:12, background:'var(--bs-body-secondary-bg)' }}>
            {products.length === 0
              ? <div style={{ textAlign:'center', padding:'60px 0', color:'var(--bs-secondary-color)' }}><div style={{ fontSize:52 }}>🔍</div><p style={{ marginTop:12 }}>No products found</p></div>
              : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(145px,1fr))', gap:10 }}>
                  {products.map(p => {
                    const color = CAT_COLORS[p.cat] || '#405189'; const low = p.stock>0&&p.stock<=5; const out = p.stock===0; const inCart = cart.find(i=>i.id===p.id)
                    return (
                      <button key={p.id} onClick={() => !out && addProductToCart(p)} disabled={out}
                        style={{ border: inCart ? `2px solid ${color}` : '1px solid var(--bs-border-color)', borderRadius:10, padding:12, background:'var(--bs-body-bg,#fff)', cursor: out?'not-allowed':'pointer', opacity: out?.45:1, textAlign:'left', position:'relative', boxShadow: inCart ? `0 0 0 3px ${color}25` : '0 1px 3px rgba(0,0,0,.06)' }}>
                        {inCart && <div style={{ position:'absolute', top:-7, right:-7, width:20, height:20, borderRadius:'50%', background:color, color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{inCart.qty}</div>}
                        {low && !out && <div style={{ position:'absolute', top:6, left:6, fontSize:8, fontWeight:700, color:'#f7b84b', textTransform:'uppercase' }}>Low</div>}
                        <div style={{ height:64, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:color+'15', fontSize:36, marginBottom:8 }}>{p.icon}</div>
                        <div style={{ fontSize:11, fontWeight:600, lineHeight:1.3, marginBottom:4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{p.name}</div>
                        <div style={{ fontSize:9, color:'var(--bs-secondary-color)', marginBottom:6 }}>{p.sku} · per {p.unit}</div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:13, fontWeight:800, color }}>{fmt(p.price)}</span>
                          <span style={{ fontSize:9, color: p.stock<=5?'#f06548':'var(--bs-secondary-color)' }}>{p.stock} left</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
            }
          </div>
        </div>

        {/* ── RIGHT: Order Panel ────────────────────────────────────────── */}
        <div style={{ width:500, flexShrink:0, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bs-body-bg,#fff)' }}>

          {/* Held orders strip */}
          {heldOrders.length > 0 && (
            <div style={{ padding:'6px 12px', background:'#f7b84b20', borderBottom:'1px solid #f7b84b40', display:'flex', gap:6, overflowX:'auto' }}>
              <span style={{ fontSize:10, color:'#f7b84b', fontWeight:700, alignSelf:'center', flexShrink:0 }}>HELD:</span>
              {heldOrders.map((h,i) => (
                <button key={i} onClick={() => recallOrder(i)}
                  style={{ fontSize:10, padding:'2px 8px', borderRadius:10, border:'1px solid #f7b84b', background:'transparent', cursor:'pointer', color:'var(--bs-body-color)', whiteSpace:'nowrap' }}>
                  #{i+1} · {fmt(h.cart.reduce((s,ci)=>s+ci.price*ci.qty,0))}
                </button>
              ))}
            </div>
          )}

          {/* Order header */}
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--bs-border-color)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#0ab39c0f' }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#0ab39c' }}>{orderId}</div>
              <div style={{ fontSize:10, color:'var(--bs-secondary-color)' }}>{itemCount} item{itemCount!==1?'s':''} · {fmt(total)}</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setShowCustPanel(!showCustPanel)}
                style={{ fontSize:11, padding:'4px 10px', border:'1px solid var(--bs-border-color)', borderRadius:6, background:'transparent', cursor:'pointer', color: customer?'#0ab39c':'inherit' }}>
                {customer ? `👤 ${customer.name.split(' ')[0]}` : '👤 Customer'}
              </button>
              {cart.length > 0 && <button onClick={clearCart} style={{ fontSize:10, padding:'4px 8px', border:'1px solid #f06548', borderRadius:6, background:'transparent', cursor:'pointer', color:'#f06548' }}>Clear</button>}
            </div>
          </div>

          {/* Customer panel */}
          {showCustPanel && (
            <div style={{ padding:12, borderBottom:'1px solid var(--bs-border-color)', background:'var(--bs-body-secondary-bg)' }}>
              <input type="text" placeholder="Search customer…" value={custSearch} onChange={e => setCustSearch(e.target.value)}
                style={{ width:'100%', height:32, padding:'0 10px', border:'1px solid var(--bs-border-color)', borderRadius:6, fontSize:12, marginBottom:8, background:'var(--bs-body-bg)', color:'var(--bs-body-color)' }} />
              <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:140, overflowY:'auto' }}>
                {filteredCustomers.map(c => (
                  <button key={c.id} onClick={() => { setCustomer(c); setShowCustPanel(false); setCustSearch('') }}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', border: customer?.id===c.id?'1.5px solid #0ab39c':'1px solid var(--bs-border-color)', borderRadius:8, background: customer?.id===c.id?'#0ab39c10':'var(--bs-body-bg)', cursor:'pointer', textAlign:'left' }}>
                    <div><div style={{ fontSize:12, fontWeight:600 }}>{c.name}</div><div style={{ fontSize:10, color:'var(--bs-secondary-color)' }}>{c.phone}</div></div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, fontWeight:700, color: TIER_COLOR[c.tier] }}>{c.tier}</div>
                      <div style={{ fontSize:9, color:'var(--bs-secondary-color)' }}>{c.points.toLocaleString()} pts</div>
                    </div>
                  </button>
                ))}
              </div>
              {customer && <button onClick={() => { setCustomer(null); setShowCustPanel(false) }} style={{ width:'100%', marginTop:6, padding:'4px 0', fontSize:11, border:'1px solid #f06548', borderRadius:6, background:'transparent', cursor:'pointer', color:'#f06548' }}>Remove Customer</button>}
            </div>
          )}

          {/* Customer bar */}
          {customer && !showCustPanel && (
            <div style={{ padding:'8px 14px', background:'#0ab39c10', borderBottom:'1px solid #0ab39c30', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background: TIER_COLOR[customer.tier], display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:11, flexShrink:0 }}>
                {customer.name.split(' ').map(n=>n[0]).join('')}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700 }}>{customer.name}</div>
                <div style={{ fontSize:10, color:'var(--bs-secondary-color)' }}>
                  <span style={{ color: TIER_COLOR[customer.tier], fontWeight:600 }}>{customer.tier}</span>
                  {' · '}{customer.points.toLocaleString()} pts
                  {' · '}<span style={{ color:'#0ab39c' }}>Wallet {fmt(customer.wallet)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cart items */}
          <div style={{ flex:1, overflowY:'auto', padding:'4px 0' }}>
            {cart.length === 0
              ? <div style={{ textAlign:'center', padding:'50px 20px', color:'var(--bs-secondary-color)' }}>
                  <div style={{ fontSize:44 }}>🛒</div>
                  <p style={{ marginTop:10, fontSize:13 }}>Scan a barcode or tap a product<br/>to start the order</p>
                  <div style={{ marginTop:16, padding:'8px 14px', background:'#0ab39c10', borderRadius:8, border:'1px dashed #0ab39c50', fontSize:11, color:'#0ab39c' }}>
                    💡 Point scanner at a barcode and it<br/>will appear here automatically
                  </div>
                </div>
              : cart.map(item => {
                  const color = CAT_COLORS[item.cat] || '#405189'; const isHighlit = highlightId === item.id
                  return (
                    <div key={item.id} style={{ padding:'8px 14px', borderBottom:'1px solid var(--bs-border-color)', background: isHighlit ? color+'18' : 'transparent', transition:'background .4s' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:22, flexShrink:0 }}>{item.icon}</span>
                        <div style={{ flex:1, overflow:'hidden' }}>
                          <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                          <div style={{ fontSize:10, color:'var(--bs-secondary-color)' }}>{fmt(item.price)}/{item.unit}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                          <button onClick={() => updateQty(item.id, item.qty-1)} style={{ width:22, height:22, borderRadius:'50%', border:'1px solid var(--bs-border-color)', background:'transparent', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--bs-body-color)' }}>−</button>
                          <input type="number" min="1" value={item.qty} onChange={e => updateQty(item.id, parseInt(e.target.value)||1)}
                            style={{ width:36, height:24, textAlign:'center', border:'1px solid var(--bs-border-color)', borderRadius:4, fontSize:12, fontWeight:700, background:'var(--bs-body-bg)', color:'var(--bs-body-color)' }} />
                          <button onClick={() => updateQty(item.id, item.qty+1)} style={{ width:22, height:22, borderRadius:'50%', border:'1px solid var(--bs-border-color)', background:'transparent', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--bs-body-color)' }}>+</button>
                        </div>
                        <div style={{ minWidth:60, textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color }}>{fmt(item.price*item.qty)}</div>
                          <button onClick={() => updateQty(item.id,0)} style={{ fontSize:10, color:'#f06548', background:'none', border:'none', cursor:'pointer', padding:0 }}><i className="ri-delete-bin-line"></i> remove</button>
                        </div>
                      </div>
                      <input type="text" placeholder="+ Item note…" value={item.note} onChange={e => updateNote(item.id, e.target.value)}
                        style={{ width:'100%', height:26, marginTop:4, padding:'0 8px', fontSize:10, border:'1px dashed var(--bs-border-color)', borderRadius:4, background:'transparent', color:'var(--bs-secondary-color)' }} />
                    </div>
                  )
                })
            }
          </div>

          {/* Order note */}
          {cart.length > 0 && (
            <div style={{ padding:'6px 14px', borderTop:'1px solid var(--bs-border-color)' }}>
              <input type="text" placeholder="📝 Order note…" value={orderNote} onChange={e => setOrderNote(e.target.value)}
                style={{ width:'100%', height:30, padding:'0 10px', fontSize:11, border:'1px solid var(--bs-border-color)', borderRadius:6, background:'var(--bs-body-bg)', color:'var(--bs-body-color)' }} />
            </div>
          )}

          {/* Discount */}
          <div style={{ padding:'6px 14px', borderTop:'1px solid var(--bs-border-color)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:10, fontWeight:700, color:'var(--bs-secondary-color)', textTransform:'uppercase', letterSpacing:.5 }}>Discount</span>
            {[0,5,10,15,20].map(d => (
              <button key={d} onClick={() => setDiscountPct(d)}
                style={{ fontSize:10, padding:'2px 8px', borderRadius:10, border: discountPct===d?'none':'1px solid var(--bs-border-color)', background: discountPct===d?'#0ab39c':'transparent', color: discountPct===d?'#fff':'var(--bs-body-color)', cursor:'pointer', fontWeight: discountPct===d?700:400 }}>
                {d===0?'None':d+'%'}
              </button>
            ))}
          </div>

          {/* Totals */}
          <div style={{ padding:'8px 14px', borderTop:'1px solid var(--bs-border-color)', background:'var(--bs-body-secondary-bg)' }}>
            {[
              { label:'Subtotal',                    value:fmt(subtotal),         show:true              },
              { label:`Discount (${discountPct}%)`,  value:'− '+fmt(discountAmt), show:discountPct>0, color:'#f06548' },
              { label:'VAT (7.5%)',                  value:fmt(vat),              show:true, color:'var(--bs-secondary-color)' },
            ].filter(r=>r.show).map(r=>(
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:11, color:'var(--bs-secondary-color)' }}>{r.label}</span>
                <span style={{ fontSize:11, fontWeight:600, color:r.color||'inherit' }}>{r.value}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6, borderTop:'2px solid var(--bs-border-color)', marginTop:4 }}>
              <span style={{ fontSize:14, fontWeight:800 }}>Total Payable</span>
              <span style={{ fontSize:17, fontWeight:900, color:'#0ab39c' }}>{fmt(total)}</span>
            </div>
          </div>

          {/* ── PAYMENT METHODS ─────────────────────────────────────────── */}
          <div style={{ padding:'12px 14px', borderTop:'2px solid var(--bs-border-color)', background:'var(--bs-body-secondary-bg)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--bs-secondary-color)', textTransform:'uppercase', letterSpacing:.8, marginBottom:10 }}>
              Select Payment Method
            </div>
            {/* 3-column grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
              {[
                { id:'cash',     label:'Cash',          sub:'Notes & coins',    icon:'ri-money-dollar-circle-line', color:'#0ab39c', bg:'rgba(10,179,156,.1)'  },
                { id:'card',     label:'Card / POS',    sub:'External terminal',icon:'ri-bank-card-line',           color:'#405189', bg:'rgba(64,81,137,.1)'   },
                { id:'qr',       label:'QR / USSD',     sub:'Scan or dial code',icon:'ri-qr-code-line',            color:'#299cdb', bg:'rgba(41,156,219,.1)'  },
                { id:'transfer', label:'Bank Transfer', sub:'Direct to account',icon:'ri-bank-line',               color:'#f7b84b', bg:'rgba(247,184,75,.1)'  },
                { id:'split',    label:'Split',         sub:'Multiple methods', icon:'ri-layout-column-line',      color:'#a78bfa', bg:'rgba(167,139,250,.1)' },
              ].map(m => (
                <button key={m.id}
                  disabled={cart.length === 0}
                  onClick={() => { if (cart.length > 0) setActiveModal(m.id) }}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                    padding:'12px 8px', borderRadius:12,
                    border: `1.5px solid ${cart.length===0 ? 'var(--bs-border-color)' : m.color+'50'}`,
                    background: cart.length===0 ? 'var(--bs-body-bg)' : m.bg,
                    cursor: cart.length===0 ? 'not-allowed' : 'pointer',
                    opacity: cart.length===0 ? .45 : 1,
                    transition:'all .15s',
                  }}>
                  <div style={{ width:38, height:38, borderRadius:10, background: m.color+'20', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className={m.icon} style={{ fontSize:20, color:m.color }}></i>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--bs-body-color)', lineHeight:1.2 }}>{m.label}</div>
                    <div style={{ fontSize:9, color:'var(--bs-secondary-color)', marginTop:2 }}>{m.sub}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* External POS notice */}
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, background:'rgba(64,81,137,.08)', border:'1px dashed rgba(64,81,137,.3)' }}>
              <i className="ri-information-line" style={{ color:'#405189', fontSize:14, flexShrink:0 }}></i>
              <span style={{ fontSize:10, color:'var(--bs-secondary-color)', lineHeight:1.4 }}>
                Card payments use an <strong style={{ color:'#405189' }}>external POS terminal</strong>. Process on the device, then confirm here to record.
              </span>
            </div>
          </div>

          {/* ── QUICK ACTIONS BAR ───────────────────────────────────────────── */}
          <div style={{ display:'flex', borderTop:'1px solid var(--bs-border-color)', background:'var(--bs-body-bg)' }}>
            {[
              { label:'Hold',      icon:'ri-pause-circle-line',   color:'#0ab39c', modal:'hold'     },
              { label:'Invoice',   icon:'ri-file-text-line',      color:'#f06548', modal:'invoice'  },
              { label:'Pay Later', icon:'ri-time-line',           color:'#f7b84b', modal:'paylater' },
              { label:'History',   icon:'ri-folder-history-line', color:'#299cdb', modal:'history'  },
            ].map(b => (
              <button key={b.label} onClick={() => setActiveModal(b.modal)}
                style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'10px 4px', background:'transparent', border:'none', cursor:'pointer' }}>
                <span style={{ width:32, height:32, borderRadius:'50%', background:b.color+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className={b.icon} style={{ fontSize:15, color:b.color }}></i>
                </span>
                <span style={{ fontSize:10, fontWeight:600, color:'var(--bs-secondary-color)' }}>{b.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ MODALS ════════════════════════════════════════════════════════ */}
      {/* Shared backdrop */}
      {activeModal && activeModal !== 'success' && (
        <div className="modal-backdrop show" style={{ zIndex:800 }} onClick={closeModal} />
      )}

      {/* ─── Scanner Basket Modal ───────────────────────────────────────── */}
      {activeModal === 'scanner' && (() => {
        const scSub   = scanCart.reduce((s, i) => s + i.price * i.qty, 0)
        const scVat   = Math.round(scSub * 0.075)
        const scTotal = scSub + scVat
        return (
          <div className="modal show d-block" style={{ zIndex:810 }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth:780 }}>
            <div className="modal-content" style={{ borderRadius:16, overflow:'hidden' }}>
              {/* Header */}
              <div className="modal-header py-3 px-4" style={{ background:'linear-gradient(135deg,#0ab39c,#405189)' }}>
                <div className="d-flex align-items-center gap-3">
                  <div style={{ width:48, height:48, borderRadius:12, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>🛒</div>
                  <div>
                    <h5 className="modal-title mb-0" style={{ color:'#fff', fontSize:18, fontWeight:700 }}>Scan Basket</h5>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.8)', marginTop:2 }}>Scan or type a barcode / SKU then press Enter to add items</div>
                  </div>
                </div>
                <button className="btn-close btn-close-white ms-auto" onClick={() => { setScanCart([]); closeModal() }}></button>
              </div>

              <div className="modal-body p-0" style={{ display:'flex', flexDirection:'column' }}>
                {/* Scan input row */}
                <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--bs-border-color)', background:'var(--bs-body-secondary-bg)' }}>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text" style={{ background:'#0ab39c', border:'none', color:'#fff', fontSize:20, paddingInline:16 }}>
                      <i className="ri-barcode-line"></i>
                    </span>
                    <input
                      ref={scanModalInputRef}
                      type="text"
                      className="form-control"
                      placeholder="Scan barcode or type SKU + Enter…"
                      value={scanCode}
                      autoFocus
                      autoComplete="off"
                      onChange={e => setScanCode(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { scannerAddProduct(scanCode) } }}
                      style={{ fontSize:15, fontWeight:500 }}
                    />
                    <button
                      className="btn btn-primary px-4"
                      onClick={() => scannerAddProduct(scanCode)}
                      style={{ fontSize:14, fontWeight:600 }}>
                      <i className="ri-add-line me-1"></i>Add
                    </button>
                  </div>
                </div>

                {/* Cart items */}
                <div style={{ minHeight:280, maxHeight:'45vh', overflowY:'auto' }}>
                  {scanCart.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'70px 20px', color:'var(--bs-secondary-color)' }}>
                      <div style={{ fontSize:68 }}>📦</div>
                      <div style={{ marginTop:14, fontWeight:700, fontSize:17 }}>No items scanned yet</div>
                      <div style={{ fontSize:13, marginTop:6 }}>Scan a barcode or type a SKU above to start building the basket</div>
                    </div>
                  ) : scanCart.map((item, idx) => {
                    const color = CAT_COLORS[item.cat] || '#0ab39c'
                    return (
                      <div key={item.id} style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 20px', borderBottom:'1px solid var(--bs-border-color)', animation: idx === scanCart.length - 1 ? 'fadeIn .25s ease' : undefined }}>
                        {/* Icon */}
                        <div style={{ width:52, height:52, borderRadius:12, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>
                          {item.icon}
                        </div>
                        {/* Details */}
                        <div style={{ flex:1, overflow:'hidden' }}>
                          <div style={{ fontWeight:600, fontSize:15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</div>
                          <div style={{ fontSize:12, color:'var(--bs-secondary-color)', marginTop:2 }}>{item.sku} &nbsp;·&nbsp; {fmt(item.price)} per {item.unit}</div>
                        </div>
                        {/* Qty stepper */}
                        <div className="d-flex align-items-center gap-2" style={{ flexShrink:0 }}>
                          <button className="btn btn-outline-secondary" style={{ width:36, height:36, padding:0, fontSize:18, lineHeight:1 }}
                            onClick={() => scannerUpdateQty(item.id, item.qty - 1)}>−</button>
                          <span style={{ minWidth:32, textAlign:'center', fontWeight:800, fontSize:17 }}>{item.qty}</span>
                          <button className="btn btn-outline-secondary" style={{ width:36, height:36, padding:0, fontSize:18, lineHeight:1 }}
                            onClick={() => scannerUpdateQty(item.id, item.qty + 1)}>+</button>
                        </div>
                        {/* Line total */}
                        <div style={{ minWidth:100, textAlign:'right', fontWeight:800, fontSize:16, flexShrink:0, color:'var(--bs-body-color)' }}>
                          {fmt(item.price * item.qty)}
                        </div>
                        {/* Remove */}
                        <button className="btn btn-link text-danger p-0" style={{ flexShrink:0 }}
                          onClick={() => scannerUpdateQty(item.id, 0)}>
                          <i className="ri-delete-bin-6-line" style={{ fontSize:20 }}></i>
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Totals + actions */}
                {scanCart.length > 0 && (
                  <div style={{ padding:'16px 20px', borderTop:'2px solid var(--bs-border-color)', background:'var(--bs-body-secondary-bg)' }}>
                    <div className="d-flex justify-content-between mb-2" style={{ fontSize:13, color:'var(--bs-secondary-color)' }}>
                      <span>Subtotal ({scanCart.reduce((s,i) => s+i.qty, 0)} items)</span>
                      <span>{fmt(scSub)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-3" style={{ fontSize:13, color:'var(--bs-secondary-color)' }}>
                      <span>VAT (7.5%)</span>
                      <span>{fmt(scVat)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-4">
                      <span style={{ fontWeight:700, fontSize:18 }}>Total</span>
                      <span style={{ fontWeight:900, fontSize:24, color:'#0ab39c' }}>{fmt(scTotal)}</span>
                    </div>
                    <div className="d-flex gap-3">
                      <button className="btn btn-outline-primary flex-fill py-3" style={{ fontSize:15, fontWeight:700 }}
                        onClick={scannerAddToOrder}>
                        <i className="ri-add-circle-line me-2" style={{ fontSize:18 }}></i>Add to Order
                      </button>
                      <button className="btn btn-primary flex-fill py-3" style={{ fontSize:15, fontWeight:700 }}
                        onClick={scannerQuickPay}>
                        <i className="ri-secure-payment-line me-2" style={{ fontSize:18 }}></i>Quick Pay
                      </button>
                    </div>
                    <div style={{ textAlign:'center', fontSize:11, color:'var(--bs-secondary-color)', marginTop:10 }}>
                      <b>Add to Order</b> — merges into current order &nbsp;·&nbsp; <b>Quick Pay</b> — goes straight to payment
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
        <div className="modal show d-block" style={{ zIndex:810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth:820 }}>
          <div className="modal-content" style={{ borderRadius:16, overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

            {/* Header */}
            <div className="modal-header px-4 py-3" style={{ background:'linear-gradient(135deg,#405189,#0ab39c)', flexShrink:0 }}>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width:46, height:46, borderRadius:12, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>📥</div>
                <div>
                  <h5 className="modal-title mb-0" style={{ color:'#fff', fontSize:18, fontWeight:700 }}>Online Orders</h5>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.8)', marginTop:2 }}>
                    {onlineOrders.filter(o=>o.status==='new').length} new · {onlineOrders.filter(o=>o.status==='pending').length} pending · {onlineOrders.length} total
                  </div>
                </div>
              </div>
              <button className="btn-close btn-close-white ms-auto" onClick={closeModal}></button>
            </div>

            {/* Filter tabs */}
            <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--bs-border-color)', background:'var(--bs-body-bg)', flexShrink:0 }}>
              {[
                { key:'all',        label:'All Orders',  count: onlineOrders.length },
                { key:'new',        label:'🔴 New',       count: onlineOrders.filter(o=>o.status==='new').length },
                { key:'pending',    label:'🟡 Pending',   count: onlineOrders.filter(o=>o.status==='pending').length },
                { key:'processing', label:'🔵 Processing',count: onlineOrders.filter(o=>o.status==='processing').length },
              ].map(tab => (
                <button key={tab.key} onClick={() => setOnlineFilter(tab.key)}
                  style={{ flex:1, padding:'12px 8px', border:'none', borderBottom: onlineFilter===tab.key ? '3px solid #405189' : '3px solid transparent', background:'transparent', fontWeight: onlineFilter===tab.key ? 700 : 500, fontSize:13, color: onlineFilter===tab.key ? '#405189' : 'var(--bs-secondary-color)', cursor:'pointer', transition:'all .15s' }}>
                  {tab.label} <span style={{ marginLeft:4, background: onlineFilter===tab.key?'#405189':'var(--bs-border-color)', color: onlineFilter===tab.key?'#fff':'var(--bs-secondary-color)', borderRadius:20, padding:'1px 8px', fontSize:11 }}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Order list */}
            <div style={{ overflowY:'auto', flex:1 }}>
              {onlineOrders
                .filter(o => onlineFilter === 'all' || o.status === onlineFilter)
                .map(order => {
                  const ch       = CHANNEL_META[order.channel]
                  const st       = STATUS_META[order.status]
                  const orderTotal = order.items.reduce((s, { productId, qty }) => {
                    const p = PRODUCTS.find(x => x.id === productId)
                    return s + (p ? p.price * qty : 0)
                  }, 0)
                  const isExpanded = expandedOrder === order.id
                  return (
                    <div key={order.id} style={{ borderBottom:'1px solid var(--bs-border-color)', padding:'16px 20px', transition:'background .15s' }}>
                      {/* Order header row */}
                      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                        {/* Channel icon */}
                        <div style={{ width:44, height:44, borderRadius:12, background:ch.color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <i className={ch.icon} style={{ fontSize:22, color:ch.color }}></i>
                        </div>
                        {/* Info */}
                        <div style={{ flex:1, overflow:'hidden' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                            <span style={{ fontWeight:700, fontSize:14 }}>{order.id}</span>
                            <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20, background:st.bg, color:st.color, fontWeight:700 }}>{st.label}</span>
                            <span style={{ fontSize:11, color:'var(--bs-secondary-color)' }}><i className={ch.icon + ' me-1'}></i>{ch.label}</span>
                          </div>
                          <div style={{ fontSize:13, marginTop:3 }}>
                            <span style={{ fontWeight:600 }}>{order.customer}</span>
                            <span style={{ color:'var(--bs-secondary-color)', marginLeft:8 }}>{order.phone}</span>
                          </div>
                          <div style={{ fontSize:11, color:'var(--bs-secondary-color)', marginTop:2 }}>
                            🕐 {order.time} &nbsp;·&nbsp; {order.items.reduce((s,i)=>s+i.qty,0)} items &nbsp;·&nbsp; <strong style={{ color:'var(--bs-body-color)' }}>{fmt(orderTotal)}</strong>
                          </div>
                        </div>
                        {/* Actions */}
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                            style={{ fontSize:12 }}>
                            <i className={isExpanded ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                          </button>
                          {order.status !== 'processing' && (
                            <button
                              className="btn btn-sm btn-primary px-3"
                              onClick={() => loadOnlineOrderToCart(order)}
                              style={{ fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>
                              <i className="ri-shopping-cart-2-line me-1"></i>Load to Cart
                            </button>
                          )}
                          {order.status === 'processing' && (
                            <span style={{ fontSize:11, color:'#299cdb', fontWeight:600 }}>
                              <i className="ri-check-double-line me-1"></i>Loaded
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded item list */}
                      {isExpanded && (
                        <div style={{ marginTop:12, background:'var(--bs-body-secondary-bg)', borderRadius:10, overflow:'hidden', border:'1px solid var(--bs-border-color)' }}>
                          {order.note && (
                            <div style={{ padding:'8px 14px', background:'#f7b84b18', borderBottom:'1px solid var(--bs-border-color)', fontSize:12, color:'#8b6914' }}>
                              <i className="ri-sticky-note-line me-1"></i><strong>Note:</strong> {order.note}
                            </div>
                          )}
                          {order.items.map(({ productId, qty }) => {
                            const p = PRODUCTS.find(x => x.id === productId)
                            if (!p) return null
                            const color = CAT_COLORS[p.cat] || '#0ab39c'
                            return (
                              <div key={productId} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderBottom:'1px solid var(--bs-border-color)' }}>
                                <div style={{ width:34, height:34, borderRadius:8, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{p.icon}</div>
                                <div style={{ flex:1, fontSize:13, fontWeight:500 }}>{p.name}</div>
                                <div style={{ fontSize:12, color:'var(--bs-secondary-color)' }}>× {qty}</div>
                                <div style={{ fontSize:13, fontWeight:700, minWidth:80, textAlign:'right' }}>{fmt(p.price * qty)}</div>
                              </div>
                            )
                          })}
                          <div style={{ display:'flex', justifyContent:'flex-end', padding:'10px 14px', fontWeight:800, fontSize:14 }}>
                            Total: <span style={{ color:'#0ab39c', marginLeft:8 }}>{fmt(orderTotal)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              }
            </div>

          </div>
          </div>
        </div>
      )}

      {/* ─── Cash Modal ─────────────────────────────────────────────────── */}
      {activeModal === 'cash' && (
        <div className="modal show d-block" style={{ zIndex:810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth:440 }}>
          <div className="modal-content">
            <div className="modal-header">
              <h6 className="modal-title">Cash Payment</h6>
              <button className="btn-close" onClick={closeModal}></button>
            </div>
            <div className="modal-body">
              {/* Summary */}
              <div className="mb-5">
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted">Total Payable</span>
                  <span className="fw-semibold fs-17">{fmt(total)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Payment Method</span>
                  <span className="badge bg-success-subtle text-success border border-success-subtle">Cash</span>
                </div>
              </div>
              {/* Cash input */}
              <div className="mb-3">
                <label className="form-label fw-medium">Cash Received</label>
                <div className="input-group">
                  <span className="input-group-text">₦</span>
                  <input type="number" className="form-control" placeholder="0.00"
                    value={cashReceived} onChange={e => setCashReceived(e.target.value)} autoFocus />
                </div>
              </div>
              {/* Quick amounts */}
              <div className="d-flex flex-wrap gap-2 mb-5">
                {[500,1000,2000,5000].map(a => (
                  <button key={a} type="button" className="btn btn-outline-light border flex-fill"
                    onClick={() => setCashReceived(String(a))}>{fmt(a)}</button>
                ))}
                <button type="button" className="btn btn-outline-light border flex-fill"
                  onClick={() => setCashReceived(String(total))}>Exact</button>
              </div>
              {/* Change / short alert */}
              {cashReceived && Number(cashReceived) >= total && (
                <div className="alert alert-success d-flex justify-content-between align-items-center mb-4">
                  <span className="fw-medium">Change to Return</span>
                  <span className="fw-semibold">{fmt(cashChange)}</span>
                </div>
              )}
              {cashReceived && Number(cashReceived) < total && (
                <div className="alert alert-danger d-flex justify-content-between align-items-center mb-4">
                  <span className="fw-medium">Amount Short</span>
                  <span className="fw-semibold">{fmt(total - Number(cashReceived))}</span>
                </div>
              )}
              <div className="d-flex gap-3 mt-7">
                <button type="button" className="btn btn-light w-50" onClick={closeModal}>Cancel</button>
                <button type="button" className="btn btn-primary w-50"
                  disabled={!cashReceived || Number(cashReceived) < total}
                  onClick={() => confirmPayment('Cash')}>Submit</button>
              </div>
            </div>
          </div></div>
        </div>
      )}

      {/* ─── Card / POS Modal ───────────────────────────────────────────── */}
      {activeModal === 'card' && (
        <div className="modal show d-block" style={{ zIndex:810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth:460 }}>
          <div className="modal-content">
            <div className="modal-header">
              <h6 className="modal-title d-flex align-items-center gap-2">
                <i className="ri-bank-card-line text-primary"></i> Card / POS Payment
              </h6>
              <button className="btn-close" onClick={closeModal}></button>
            </div>
            <div className="modal-body">
              {/* Amount */}
              <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <span className="text-muted">Total to charge on terminal</span>
                <span className="fw-bold fs-17">{fmt(total)}</span>
              </div>

              {/* Terminal instruction strip */}
              <div style={{ background:'rgba(64,81,137,.08)', border:'1px solid rgba(64,81,137,.2)', borderRadius:10, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
                <i className="ri-bank-card-2-line" style={{ fontSize:28, color:'#405189', flexShrink:0 }}></i>
                <div style={{ fontSize:12, color:'var(--bs-secondary-color)', lineHeight:1.6 }}>
                  Process <strong style={{ color:'var(--bs-body-color)' }}>{fmt(total)}</strong> on the external POS terminal.<br/>
                  Once the terminal confirms, click <strong style={{ color:'#405189' }}>Confirm Payment</strong> below — the system will record it automatically.
                </div>
              </div>

              {/* Card type (optional, for records) */}
              <div className="mb-4">
                <label className="form-label fw-semibold" style={{ fontSize:12 }}>Card Type <span className="text-muted fw-normal">(optional)</span></label>
                <div className="d-flex gap-2">
                  {['Visa','Mastercard','Verve','Other'].map(t => (
                    <button key={t} type="button"
                      onClick={() => setCardTab(t.toLowerCase())}
                      style={{ flex:1, padding:'8px 4px', borderRadius:8, border: cardTab===t.toLowerCase() ? '2px solid #405189' : '1px solid var(--bs-border-color)', background: cardTab===t.toLowerCase() ? 'rgba(64,81,137,.1)' : 'transparent', fontSize:11, fontWeight:600, cursor:'pointer', color: cardTab===t.toLowerCase() ? '#405189' : 'var(--bs-secondary-color)' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="d-flex gap-3">
                <button type="button" className="btn btn-light w-50" onClick={closeModal}>Cancel</button>
                <button type="button" className="btn btn-primary w-50" onClick={() => confirmPayment('Card / POS')}>
                  <i className="ri-check-double-line me-1"></i>Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ─── QR / USSD Modal ────────────────────────────────────────────── */}
      {activeModal === 'qr' && (
        <div className="modal show d-block" style={{ zIndex:810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth:340 }}>
          <div className="modal-content">
            <div className="modal-body text-center pt-4">
              <div style={{ fontSize:12, color:'var(--bs-secondary-color)', marginBottom:4 }}>Total Amount</div>
              <div style={{ fontSize:26, fontWeight:900, marginBottom:16 }}>{fmt(total)}</div>
              {/* Fake QR placeholder */}
              <div style={{ width:160, height:160, margin:'0 auto 12px', background:'#f8f9fa', border:'2px solid var(--bs-border-color)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:6, color:'var(--bs-secondary-color)' }}>
                <i className="ri-qr-code-line" style={{ fontSize:72 }}></i>
                <div style={{ fontSize:9, fontWeight:600, letterSpacing:.5 }}>SCAN TO PAY</div>
              </div>
              <p className="text-muted mb-1" style={{ fontSize:12 }}>Ask customer to scan the QR code<br/>or dial USSD to complete payment</p>
              <div style={{ background:'#405189', color:'#fff', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:700, marginBottom:16, display:'inline-block' }}>
                *737*000#{total}
              </div>
              <div className="d-flex gap-3">
                <button type="button" className="btn btn-light w-50" onClick={closeModal}>Cancel</button>
                <button type="button" className="btn btn-primary w-50" onClick={() => confirmPayment('QR / USSD')}>Confirm Payment</button>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ─── Bank Transfer Modal ────────────────────────────────────────── */}
      {activeModal === 'transfer' && (
        <div className="modal show d-block" style={{ zIndex:810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth:440 }}>
          <div className="modal-content">
            <div className="modal-header"><h6 className="modal-title">Bank Transfer</h6><button className="btn-close" onClick={closeModal}></button></div>
            <div className="modal-body pt-3">
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Total Payable</span>
                  <span className="fw-semibold fs-17">{fmt(total)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Payment Method</span>
                  <span className="badge bg-info-subtle text-info border border-info-subtle">Bank Transfer</span>
                </div>
              </div>
              {/* Bank details card */}
              <div className="alert alert-primary mb-4" style={{ fontSize:12 }}>
                <div className="fw-bold mb-1">Transfer to: Bems Farms Ltd</div>
                <div>GTBank · <strong>0123456789</strong></div>
                <div className="text-muted mt-1">Use <strong>{orderId}</strong> as reference</div>
              </div>
              <div className="mb-3"><label className="form-label">Customer's Bank Name</label><input type="text" className="form-control" placeholder="e.g. GTBank, Access, Zenith" value={bankName} onChange={e=>setBankName(e.target.value)} /></div>
              <div className="mb-3"><label className="form-label">Transaction Reference / Session ID</label><input type="text" className="form-control" placeholder="Enter reference number" value={txnRef} onChange={e=>setTxnRef(e.target.value)} /></div>
              <div className="mb-4"><label className="form-label">Transfer Date</label><input type="date" className="form-control" value={transferDate} onChange={e=>setTransferDate(e.target.value)} /></div>
              <div className="alert alert-info d-flex align-items-start gap-2 mb-4">
                <i className="ri-bank-line fs-5"></i>
                <div className="small">Ensure the transfer is confirmed in your bank before submitting.</div>
              </div>
              <div className="d-flex gap-3">
                <button type="button" className="btn btn-light w-50" onClick={closeModal}>Cancel</button>
                <button type="button" className="btn btn-primary w-50" onClick={() => confirmPayment('Bank Transfer')}>Submit</button>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ─── Split Payment Modal ────────────────────────────────────────── */}
      {activeModal === 'split' && (
        <div className="modal show d-block" style={{ zIndex:810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth:520 }}>
          <div className="modal-content">
            <div className="modal-header"><h6 className="modal-title">Split Payment</h6><button className="btn-close" onClick={closeModal}></button></div>
            <div className="modal-body">
              <div className="d-flex justify-content-between mb-4 pb-3 border-bottom">
                <span className="text-muted">Total Payable</span><span className="fw-semibold fs-17">{fmt(total)}</span>
              </div>
              <div className="d-flex flex-column gap-3 mb-3" id="paymentRows">
                {splitRows.map((row,i) => (
                  <div key={i} className="border rounded-3 p-3">
                    <div className="row g-2 align-items-center">
                      <div className="col-md-5">
                        <label className="form-label small text-muted">Payment Method</label>
                        <select className="form-select" value={row.method} onChange={e=>updateSplit(i,'method',e.target.value)}>
                          {['Cash','Card / POS','Bank Transfer','QR / USSD','Loyalty Points','Wallet'].map(m=>(
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-5">
                        <label className="form-label small text-muted">Amount (₦)</label>
                        <input type="number" className="form-control" placeholder="0.00" value={row.amount} onChange={e=>updateSplit(i,'amount',e.target.value)} />
                      </div>
                      <div className="col-md-2 text-end">
                        <label className="form-label small text-muted d-block">&nbsp;</label>
                        {splitRows.length > 2 && (
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setSplitRows(r=>r.filter((_,ri)=>ri!==i))}>✕</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <button type="button" className="btn btn-outline-light border" onClick={addSplitRow}><i className="ri-add-line me-1"></i>Add Another</button>
                <div style={{ fontSize:12, color:'var(--bs-secondary-color)' }}>
                  Allocated: <strong>{fmt(splitRows.reduce((s,r)=>s+(Number(r.amount)||0),0))}</strong> / {fmt(total)}
                </div>
              </div>
              <div className="d-flex gap-3">
                <button type="button" className="btn btn-light w-50" onClick={closeModal}>Cancel</button>
                <button type="button" className="btn btn-primary w-50" onClick={() => confirmPayment('Split Payment')}>Submit</button>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ─── Hold Modal ──────────────────────────────────────────────────── */}
      {activeModal === 'hold' && (
        <div className="modal show d-block" style={{ zIndex:810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth:420 }}>
          <div className="modal-content">
            <div className="modal-header"><h6 className="modal-title">Hold Bill</h6><button className="btn-close" onClick={closeModal}></button></div>
            <div className="modal-body">
              <div className="d-flex flex-column gap-4">
                <div className="rounded p-3 bg-body-secondary">
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Total Bill Amount</span>
                    <h6 className="fs-16 mb-0">{fmt(total)}</h6>
                  </div>
                </div>
                <div>
                  <label className="form-label">Hold Reference</label>
                  <input type="text" className="form-control" placeholder="e.g. Table 3 / Mrs Okonkwo order" value={holdRef} onChange={e=>setHoldRef(e.target.value)} />
                  <p className="text-muted mb-0 mt-1 fs-sm">Helps identify this bill when you recall it later.</p>
                </div>
                <div>
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" rows="3" placeholder="Optional instructions…" value={holdNote} onChange={e=>setHoldNote(e.target.value)}></textarea>
                </div>
                <div className="d-flex gap-3">
                  <button type="button" className="btn btn-light w-50" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-primary w-50" disabled={cart.length===0} onClick={doHold}>Hold Bill</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ─── Invoice Preview Modal ──────────────────────────────────────── */}
      {activeModal === 'invoice' && (
        <div className="modal show d-block" style={{ zIndex:810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth:680 }}>
          <div className="modal-content">
            <div className="modal-header border-bottom-0 pb-0">
              <div className="d-flex flex-wrap align-items-center gap-4">
                <h5 className="modal-title">Invoice Preview</h5>
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-light btn-sm px-4 h-9"><i className="ri-file-pdf-2-line me-1"></i>PDF</button>
                  <button type="button" className="btn btn-active-dark btn-sm px-4 h-9"><i className="ri-mail-line me-1"></i>Email</button>
                  <button type="button" className="btn btn-active-dark btn-sm px-4 h-9"><i className="ri-printer-line me-1"></i>Print</button>
                </div>
              </div>
              <button type="button" className="btn btn-primary flex-shrink-0 ms-auto btn-sm px-4 h-9 rounded" onClick={closeModal}>Close</button>
            </div>
            <div className="modal-body">
              <div className="border p-4 rounded">
                <div className="d-flex justify-content-between mb-4">
                  <h6 className="fs-16">{orderId}</h6>
                  <div style={{ fontSize:18, fontWeight:800, color:'#0ab39c' }}>🌾 Bems Farms</div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <p className="text-muted mb-1">Issued On:</p>
                    <h6>{new Date().toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'})}</h6>
                  </div>
                  <div className="col-md-6 text-md-end">
                    <p className="text-muted mb-1">Customer:</p>
                    <h6>{customer?.name || 'Walk-in Customer'}</h6>
                    {customer && <p className="text-muted mb-0">{customer.phone}</p>}
                  </div>
                </div>
                <div className="table-responsive mb-3">
                  <table className="table table-borderless text-nowrap align-middle">
                    <thead><tr className="border-bottom">
                      <th className="fw-medium text-muted">Item</th>
                      <th className="fw-medium text-muted text-center">Qty</th>
                      <th className="fw-medium text-muted text-end">Unit</th>
                      <th className="fw-medium text-muted text-end">Total</th>
                    </tr></thead>
                    <tbody>
                      {cart.map(item => (
                        <tr key={item.id}><td>{item.icon} {item.name}</td><td className="text-center">{item.qty}</td><td className="text-end">{fmt(item.price)}</td><td className="text-end">{fmt(item.price*item.qty)}</td></tr>
                      ))}
                      {discountPct > 0 && <tr><th colSpan="3" className="text-end text-danger">Discount ({discountPct}%)</th><th className="text-end text-danger">− {fmt(discountAmt)}</th></tr>}
                      <tr><th colSpan="3" className="text-end text-muted">VAT (7.5%)</th><th className="text-end text-muted">{fmt(vat)}</th></tr>
                      <tr><th colSpan="3" className="text-end">Total Payable</th><th className="text-end text-success">{fmt(total)}</th></tr>
                    </tbody>
                  </table>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <h6>Payment Information:</h6>
                    <p className="text-muted mb-0">Bems Farms Ltd · GTBank · 0123456789</p>
                    <p className="text-muted">Ref: {orderId}</p>
                  </div>
                  <div className="col-md-6 text-end">
                    <p className="text-muted mb-1">Fresh from farm to your table 🌱</p>
                    <p className="text-muted mb-0" style={{ fontSize:11 }}>Thank you for choosing Bems Farms!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ─── Pay Later Modal ────────────────────────────────────────────── */}
      {activeModal === 'paylater' && (
        <div className="modal show d-block" style={{ zIndex:810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth:420 }}>
          <div className="modal-content">
            <div className="modal-header"><h6 className="modal-title">Pay Later</h6><button className="btn-close" onClick={closeModal}></button></div>
            <div className="modal-body">
              <div className="d-flex flex-column gap-4">
                <div className="rounded p-3 bg-body-secondary">
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Total Bill Amount</span>
                    <h6 className="fs-16 mb-0">{fmt(total)}</h6>
                  </div>
                </div>
                <div>
                  <label className="form-label">Customer</label>
                  <input type="text" className="form-control" placeholder="Search customer name or phone" value={payLaterCust} onChange={e=>setPayLaterCust(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-control" value={payLaterDate} onChange={e=>setPayLaterDate(e.target.value)} />
                </div>
                <div className="d-flex gap-3">
                  <button type="button" className="btn btn-light w-50" onClick={closeModal}>Cancel</button>
                  <button type="button" className="btn btn-primary w-50" onClick={() => { showToast('Pay-later order saved!', 'success', '⏰'); closeModal() }}>Confirm</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ─── Billing History Modal ──────────────────────────────────────── */}
      {activeModal === 'history' && (
        <div className="modal show d-block" style={{ zIndex:810 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth:720 }}>
          <div className="modal-content">
            <div className="modal-header"><h6 className="modal-title">Billing History</h6><button className="btn-close" onClick={closeModal}></button></div>
            <div className="modal-body">
              <div className="d-flex align-items-center gap-2 mb-4">
                <div className="position-relative flex-grow-1">
                  <input type="text" className="form-control ps-9" placeholder="Search invoices…" />
                  <i className="ri-search-line size-4 position-absolute top-50 start-0 ms-3 translate-middle-y"></i>
                </div>
                <div className="dropdown">
                  <button type="button" className="btn btn-outline-light border btn-icon" data-bs-toggle="dropdown"><i className="ri-filter-3-line fs-xl"></i></button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    {['Cash','Card / POS','Transfer','QR / USSD'].map(m=><li key={m}><a href="#!" className="dropdown-item">{m}</a></li>)}
                  </ul>
                </div>
              </div>
              <div className="table-card table-responsive">
                <table className="table table-borderless align-middle mb-0">
                  <thead><tr className="bg-body-secondary">
                    <th><div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div></th>
                    <th className="fw-medium text-muted">Invoice</th>
                    <th className="fw-medium text-muted">Customer</th>
                    <th className="fw-medium text-muted">Payment</th>
                    <th className="fw-medium text-muted">Time</th>
                    <th className="fw-medium text-muted">Amount</th>
                    <th className="fw-medium text-muted text-end">Action</th>
                  </tr></thead>
                  <tbody>
                    {HISTORY_MOCK.map(h => (
                      <tr key={h.inv}>
                        <td><div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div></td>
                        <td><a href="#!" className="link link-custom-primary">{h.inv}</a></td>
                        <td>{h.cust}</td>
                        <td>{h.method}</td>
                        <td>{new Date().toLocaleDateString('en-NG',{day:'numeric',month:'short'})} <span className="text-muted ms-2">{h.time}</span></td>
                        <td className="fw-semibold">{fmt(h.amount)}</td>
                        <td>
                          <div className="dropdown d-flex justify-content-end">
                            <a href="#!" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                            <ul className="dropdown-menu dropdown-menu-end">
                              <li><a href="#!" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> View</a></li>
                              <li><a href="#!" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-printer-line"></i> Print</a></li>
                              <li><a href="#!" className="dropdown-item d-flex gap-3 align-items-center text-danger"><i className="ri-delete-bin-5-line"></i> Delete</a></li>
                            </ul>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ─── Payment Success Modal ──────────────────────────────────────── */}
      {activeModal === 'success' && successData && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:900, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ backgroundColor:'var(--bs-modal-bg, #ffffff)', borderRadius:16, width:'100%', maxWidth:380, boxShadow:'0 24px 48px rgba(0,0,0,.3)', border:'1px solid var(--bs-modal-border-color, rgba(0,0,0,.175))' }}>
            <button type="button" className="btn-close position-absolute" style={{ top:16, right:16 }} onClick={newOrder}></button>
            <div className="modal-body pt-4 text-center pb-4">
              <div style={{ width:80, height:80, borderRadius:'50%', background:'#0ab39c', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:36 }}>✅</div>
              <h5>Payment Successful!</h5>
              <p className="text-muted mb-4">Transaction processed successfully.</p>
              <div className="mb-4">
                <small className="text-muted">Amount</small>
                <h4 className="my-1 fw-bold">{fmt(successData.total)}</h4>
                <small className="text-muted">
                  {successData.paidAt.toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})} · Bill ID: <span className="text-body fw-semibold">{successData.orderId}</span>
                </small>
              </div>
              <div className="rounded p-3 bg-body-secondary mb-4" style={{ fontSize:12, textAlign:'left' }}>
                <div className="d-flex justify-content-between mb-1"><span className="text-muted">Customer</span><span className="fw-medium">{successData.customer?.name || 'Walk-in'}</span></div>
                <div className="d-flex justify-content-between mb-1"><span className="text-muted">Method</span><span className="fw-medium">{successData.method}</span></div>
                <div className="d-flex justify-content-between"><span className="text-muted">Items</span><span className="fw-medium">{successData.cart.reduce((s,i)=>s+i.qty,0)} item(s)</span></div>
              </div>
              <div className="d-flex justify-content-center gap-2 mb-3">
                <button className="btn btn-outline-light border btn-sm"><i className="ri-file-pdf-2-line me-1"></i>Download</button>
                <button className="btn btn-outline-light border btn-sm"><i className="ri-printer-line me-1"></i>Print Receipt</button>
              </div>
              <button className="btn btn-primary w-100" onClick={newOrder}>
                <i className="ri-add-circle-line me-1"></i>New Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Goods Return Modal ─────────────────────────────────────────── */}
      {activeModal === 'return' && (() => {
        const retTotal = Number(returnForm.qty) * Number(returnForm.unitPrice)
        function submitReturn() {
          const ref = 'RTN-POS-' + String(Date.now()).slice(-5)
          setReturnLogs(prev => [...prev, { ...returnForm, ref, total:retTotal, date:new Date().toLocaleString('en-NG') }])
          setReturnSuccess({ ref, total:retTotal, method:returnForm.refundMethod, condition:returnForm.condition })
        }
        if (returnSuccess) return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:820, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div style={{ background:'var(--bs-modal-bg,#fff)', borderRadius:16, maxWidth:360, width:'100%', padding:32, textAlign:'center', boxShadow:'0 24px 48px rgba(0,0,0,.3)' }}>
              <div style={{ width:72, height:72, borderRadius:'50%', background:'#0ab39c', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:32 }}>✅</div>
              <h6 className="fw-bold mb-1">Return Processed</h6>
              <div className="text-muted mb-3" style={{ fontSize:13 }}>{returnSuccess.ref}</div>
              <div className="rounded p-3 mb-4" style={{ background:'var(--bs-body-secondary-bg)', fontSize:13, textAlign:'left' }}>
                <div className="d-flex justify-content-between mb-1"><span className="text-muted">Refund Amount</span><span className="fw-bold text-danger">₦{returnSuccess.total.toLocaleString()}</span></div>
                <div className="d-flex justify-content-between mb-1"><span className="text-muted">Method</span><span>{returnSuccess.method}</span></div>
                <div className="d-flex justify-content-between"><span className="text-muted">Goods</span><span>{{resalable:'Back to stock',damaged:'Written off',partial:'Split'	}[returnSuccess.condition]}</span></div>
              </div>
              <button className="btn btn-primary w-100" onClick={closeModal}>Done</button>
            </div>
          </div>
        )
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:820, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div style={{ background:'var(--bs-modal-bg,#fff)', borderRadius:16, maxWidth:600, width:'100%', boxShadow:'0 24px 48px rgba(0,0,0,.3)', overflow:'hidden' }}>

              {/* Header */}
              <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--bs-border-color)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bs-body-secondary-bg)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#f06548,#e04b2f)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className="ri-arrow-go-back-line" style={{ fontSize:18, color:'#fff' }}></i>
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>Goods Return</div>
                    <div style={{ fontSize:11, color:'var(--bs-secondary-color)' }}>Step {returnStep} of 2</div>
                  </div>
                </div>
                <button className="btn-close" onClick={closeModal}></button>
              </div>

              {/* Step indicators */}
              <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--bs-border-color)' }}>
                {[{n:1,label:'Return Details'},{n:2,label:'Inspect & Refund'}].map(s=>(
                  <div key={s.n} style={{ flex:1, padding:'10px 16px', textAlign:'center', fontSize:12, fontWeight: returnStep===s.n?700:400, color: returnStep===s.n?'#f06548':'var(--bs-secondary-color)', borderBottom: returnStep===s.n?'3px solid #f06548':'3px solid transparent', cursor:'pointer', background:'var(--bs-body-bg)' }}
                    onClick={() => returnStep > s.n && setReturnStep(s.n)}>
                    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:20, height:20, borderRadius:'50%', background: returnStep>=s.n?'#f06548':'var(--bs-border-color)', color: returnStep>=s.n?'#fff':'var(--bs-secondary-color)', fontSize:10, fontWeight:700, marginRight:6 }}>{s.n}</span>
                    {s.label}
                  </div>
                ))}
              </div>

              <div style={{ padding:20, maxHeight:'70vh', overflowY:'auto' }}>

                {/* ── STEP 1: Details ── */}
                {returnStep === 1 && (
                  <div className="row g-3">

                    {/* Barcode scan field */}
                    <div className="col-12">
                      <label className="form-label fw-medium" style={{ fontSize:13 }}>
                        <i className="ri-barcode-line me-1 text-danger"></i>Scan Barcode / Enter SKU
                      </label>
                      <div className="position-relative">
                        <input
                          autoFocus
                          className="form-control form-control-sm ps-9"
                          placeholder="Scan barcode or type SKU + Enter  (e.g. BF-VEG-001 or VEG-001)"
                          style={{ borderColor:'#f06548', boxShadow:'0 0 0 3px rgba(240,101,72,.1)' }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const code = e.target.value.trim().toUpperCase()
                              const found = BY_BARCODE[code] || BY_BARCODE['BF-' + code] || BY_SKU[code]
                              if (found) {
                                setReturnForm(f=>({...f, product:found, unitPrice:found.price}))
                                showToast(`${found.name} selected`, 'success', found.icon)
                                e.target.value = ''
                              } else {
                                showToast('Product not found: ' + code, 'error', '❌')
                              }
                            }
                          }}
                        />
                        <i className="ri-barcode-line position-absolute top-50 start-0 ms-3 translate-middle-y text-danger"></i>
                      </div>
                      <div className="form-text">Or select manually from the dropdown below</div>
                    </div>

                    {/* Selected product preview */}
                    {returnForm.product && (
                      <div className="col-12">
                        <div className="d-flex align-items-center gap-3 p-2 rounded" style={{ background:'rgba(240,101,72,.08)', border:'1px solid rgba(240,101,72,.25)' }}>
                          <span style={{ fontSize:28 }}>{returnForm.product.icon}</span>
                          <div style={{ flex:1 }}>
                            <div className="fw-bold" style={{ fontSize:13 }}>{returnForm.product.name}</div>
                            <div className="text-muted" style={{ fontSize:11 }}>{returnForm.product.sku} · ₦{returnForm.product.price.toLocaleString()} / {returnForm.product.unit}</div>
                          </div>
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle" style={{ fontSize:10 }}>Selected</span>
                        </div>
                      </div>
                    )}

                    <div className="col-12">
                      <label className="form-label fw-medium" style={{ fontSize:13 }}>Product Being Returned <span className="text-danger">*</span></label>
                      <select className="form-select form-select-sm" value={returnForm.product.id}
                        onChange={e => { const p=PRODUCTS.find(p=>p.id===Number(e.target.value)); setReturnForm(f=>({...f,product:p,unitPrice:p.price})) }}>
                        {PRODUCTS.map(p=><option key={p.id} value={p.id}>{p.icon} {p.name} — ₦{p.price.toLocaleString()} / {p.unit}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium" style={{ fontSize:13 }}>Customer Name</label>
                      <input className="form-control form-control-sm" placeholder="Walk-in / Customer name" value={returnForm.customer}
                        onChange={e => setReturnForm(f=>({...f,customer:e.target.value}))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium" style={{ fontSize:13 }}>Phone (optional)</label>
                      <input className="form-control form-control-sm" placeholder="0800 000 0000" value={returnForm.phone}
                        onChange={e => setReturnForm(f=>({...f,phone:e.target.value}))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium" style={{ fontSize:13 }}>Quantity</label>
                      <input type="number" className="form-control form-control-sm" min="1" value={returnForm.qty}
                        onChange={e => setReturnForm(f=>({...f,qty:Number(e.target.value)}))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium" style={{ fontSize:13 }}>Unit Price (₦)</label>
                      <input type="number" className="form-control form-control-sm" min="0" value={returnForm.unitPrice}
                        onChange={e => setReturnForm(f=>({...f,unitPrice:Number(e.target.value)}))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium" style={{ fontSize:13 }}>Return Value</label>
                      <input className="form-control form-control-sm bg-light fw-bold text-danger" readOnly value={`₦${retTotal.toLocaleString()}`} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-medium" style={{ fontSize:13 }}>Return Reason <span className="text-danger">*</span></label>
                      <select className="form-select form-select-sm" value={returnForm.reason}
                        onChange={e => setReturnForm(f=>({...f,reason:e.target.value}))}>
                        {POS_RETURN_REASONS.map(r=><option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-medium" style={{ fontSize:13 }}>Customer Notes</label>
                      <textarea className="form-control form-control-sm" rows="2" placeholder="What did the customer say?" value={returnForm.notes}
                        onChange={e => setReturnForm(f=>({...f,notes:e.target.value}))} />
                    </div>
                    <div className="col-12 d-flex gap-2 pt-2">
                      <button className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                      <button className="btn btn-danger w-100" onClick={() => setReturnStep(2)} disabled={!returnForm.product||returnForm.qty<1}>
                        Next: Inspect Goods <i className="ri-arrow-right-line ms-1"></i>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: Inspect + Refund ── */}
                {returnStep === 2 && (
                  <>
                    {/* Return summary */}
                    <div className="p-3 rounded mb-4" style={{ background:'var(--bs-body-secondary-bg)', border:'1px solid var(--bs-border-color)', fontSize:13 }}>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Product</span>
                        <span className="fw-medium">{returnForm.product.icon} {returnForm.product.name}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Qty · Reason</span>
                        <span>{returnForm.qty} {returnForm.product.unit} · {returnForm.reason}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Refund Value</span>
                        <span className="fw-bold text-danger">₦{retTotal.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Goods condition */}
                    <div className="mb-4">
                      <label className="form-label fw-medium" style={{ fontSize:13 }}>Goods Condition <span className="text-danger">*</span></label>
                      <div className="row g-2">
                        {[
                          { val:'resalable', icon:'ri-checkbox-circle-line', color:'#0ab39c', title:'Resalable',        desc:'Good condition — return to stock' },
                          { val:'damaged',   icon:'ri-close-circle-line',    color:'#f06548', title:'Damaged / Spoiled',desc:'Write off — cannot resell'        },
                          { val:'partial',   icon:'ri-indeterminate-circle-line', color:'#f7b84b', title:'Partially Good',  desc:'Some back to stock, rest written off' },
                        ].map(opt => (
                          <div className="col-4" key={opt.val}>
                            <div onClick={() => setReturnForm(f=>({...f,condition:opt.val}))}
                              style={{ padding:'12px 8px', borderRadius:10, border:`2px solid ${returnForm.condition===opt.val?opt.color:'var(--bs-border-color)'}`, background: returnForm.condition===opt.val?`${opt.color}12`:'transparent', cursor:'pointer', textAlign:'center' }}>
                              <i className={`${opt.icon} d-block fs-20 mb-1`} style={{ color:opt.color }}></i>
                              <div style={{ fontSize:11, fontWeight:700, color:opt.color }}>{opt.title}</div>
                              <div className="text-muted mt-1" style={{ fontSize:10 }}>{opt.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Refund method */}
                    <div className="mb-4">
                      <label className="form-label fw-medium" style={{ fontSize:13 }}>Refund Method</label>
                      <div className="d-flex gap-2">
                        {['Cash','Wallet Credit','Bank Transfer'].map(m => (
                          <button key={m} type="button"
                            className={`btn btn-sm flex-grow-1 ${returnForm.refundMethod===m?'btn-danger':'btn-outline-secondary'}`}
                            onClick={() => setReturnForm(f=>({...f,refundMethod:m}))}>
                            {m==='Cash'?'💵':m==='Wallet Credit'?'👛':'🏦'} {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="d-flex gap-2 pt-2">
                      <button className="btn btn-light" style={{ minWidth:100 }} onClick={() => setReturnStep(1)}>
                        <i className="ri-arrow-left-line me-1"></i> Back
                      </button>
                      <button className="btn btn-danger flex-grow-1 fw-medium" onClick={submitReturn}>
                        <i className="ri-check-double-line me-1"></i>
                        Confirm Return · Refund ₦{retTotal.toLocaleString()} via {returnForm.refundMethod}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══ SCAN TOAST ═══════════════════════════════════════════════════ */}
      {toast && (
        <div style={{ position:'fixed', bottom:30, right:30, zIndex:999, padding:'10px 18px', borderRadius:10, background: toast.type==='error'?'#f06548':'#0ab39c', color:'#fff', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8, boxShadow:'0 8px 24px rgba(0,0,0,.25)', animation:'fadeIn .2s ease', maxWidth:280 }}>
          <span style={{ fontSize:20 }}>{toast.icon}</span><span>{toast.msg}</span>
        </div>
      )}

      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        body.sidebar-hidden { background: var(--bs-body-bg, #f3f6f9) !important; }
        body.sidebar-hidden .page-wrapper { display: none !important; }
        body.sidebar-hidden #main-sidebar { display: none !important; }
        body.sidebar-hidden #main-topbar  { display: none !important; }
      `}</style>
    </div>
  )
}

// ── Modal layout helpers ───────────────────────────────────────────────────────
const modalStyle = {
  position:'fixed', inset:0, zIndex:810,
  display:'flex', alignItems:'center', justifyContent:'center', padding:20,
}
function modalBox(maxW) {
  return {
    width:'100%', maxWidth:maxW, maxHeight:'90vh', overflowY:'auto',
    boxShadow:'0 24px 48px rgba(0,0,0,.35)', position:'relative',
    // Explicit opaque background — CSS variables alone can be transparent
    // when rendered outside the normal .modal > .modal-dialog hierarchy
    backgroundColor: 'var(--bs-modal-bg, #ffffff)',
    backgroundClip: 'padding-box',
    border: '1px solid var(--bs-modal-border-color, rgba(0,0,0,.175))',
    borderRadius: 12,
  }
}
