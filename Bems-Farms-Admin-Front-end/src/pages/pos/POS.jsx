import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

const CATEGORIES = [
  { id:'all',        label:'All Items',     emoji:'🛒' },
  { id:'meals',      label:'Meals',         emoji:'🍲' },
  { id:'seafood',    label:'Seafood',       emoji:'🐟' },
  { id:'meat',       label:'Meat',          emoji:'🥩' },
  { id:'grains',     label:'Grains & Carbs',emoji:'🌾' },
  { id:'vegetables', label:'Vegetables',    emoji:'🥬' },
  { id:'dairy',      label:'Dairy & Eggs',  emoji:'🥛' },
  { id:'beverages',  label:'Beverages',     emoji:'🥤' },
  { id:'farm',       label:'Fresh Farm',    emoji:'🌱' },
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
  { id:10, barcode:'BF-FSH-002',  sku:'FSH-002',  name:'Catfish (1 kg)',          cat:'seafood',    price:3500, icon:'🐠', stock:25, unit:'kg'     },
  { id:11, barcode:'BF-FSH-003',  sku:'FSH-003',  name:'Smoked Mackerel',         cat:'seafood',    price:1800, icon:'🐡', stock:40, unit:'piece'  },
  { id:12, barcode:'BF-FSH-004',  sku:'FSH-004',  name:'Dried Stockfish',         cat:'seafood',    price:2500, icon:'🦈', stock:35, unit:'piece'  },
  { id:13, barcode:'BF-FSH-005',  sku:'FSH-005',  name:'Tiger Prawns (500 g)',    cat:'seafood',    price:4500, icon:'🦐', stock:20, unit:'pack'   },
  { id:14, barcode:'BF-FSH-006',  sku:'FSH-006',  name:'Crayfish (200 g)',        cat:'seafood',    price:1500, icon:'🦞', stock:50, unit:'pack'   },
  { id:15, barcode:'BF-MT-001',   sku:'MT-001',   name:'Goat Meat (1 kg)',        cat:'meat',       price:5500, icon:'🥩', stock:22, unit:'kg'     },
  { id:16, barcode:'BF-MT-002',   sku:'MT-002',   name:'Chicken (1 kg)',          cat:'meat',       price:3800, icon:'🍗', stock:28, unit:'kg'     },
  { id:17, barcode:'BF-MT-003',   sku:'MT-003',   name:'Beef (1 kg)',             cat:'meat',       price:5000, icon:'🥓', stock:18, unit:'kg'     },
  { id:18, barcode:'BF-MT-004',   sku:'MT-004',   name:'Turkey (1 kg)',           cat:'meat',       price:4500, icon:'🦃', stock:12, unit:'kg'     },
  { id:19, barcode:'BF-GRN-001',  sku:'GRN-001',  name:'Rice (5 kg bag)',         cat:'grains',     price:6500, icon:'🌾', stock:60, unit:'bag'    },
  { id:20, barcode:'BF-GRN-002',  sku:'GRN-002',  name:'Beans (2 kg)',            cat:'grains',     price:2200, icon:'🫘', stock:45, unit:'bag'    },
  { id:21, barcode:'BF-GRN-003',  sku:'GRN-003',  name:'Yam (1 tuber)',           cat:'grains',     price:1500, icon:'🍠', stock:35, unit:'tuber'  },
  { id:22, barcode:'BF-GRN-004',  sku:'GRN-004',  name:'Plantain (bunch)',        cat:'grains',     price:1200, icon:'🍌', stock:40, unit:'bunch'  },
  { id:23, barcode:'BF-GRN-005',  sku:'GRN-005',  name:'Semolina (1 kg)',         cat:'grains',     price:1200, icon:'🫙', stock:55, unit:'kg'     },
  { id:24, barcode:'BF-VEG-001',  sku:'VEG-001',  name:'Tomatoes (1 kg)',         cat:'vegetables', price:800,  icon:'🍅', stock:3,  unit:'kg'     },
  { id:25, barcode:'BF-VEG-002',  sku:'VEG-002',  name:'Spinach / Efo Tete',     cat:'vegetables', price:500,  icon:'🥬', stock:2,  unit:'bunch'  },
  { id:26, barcode:'BF-VEG-003',  sku:'VEG-003',  name:'Ugu / Pumpkin Leaf',     cat:'vegetables', price:600,  icon:'🌿', stock:15, unit:'bunch'  },
  { id:27, barcode:'BF-VEG-004',  sku:'VEG-004',  name:'Scotch Bonnet (500 g)',  cat:'vegetables', price:700,  icon:'🌶️', stock:20, unit:'pack'   },
  { id:28, barcode:'BF-VEG-005',  sku:'VEG-005',  name:'Onions (1 kg)',          cat:'vegetables', price:600,  icon:'🧅', stock:30, unit:'kg'     },
  { id:29, barcode:'BF-EGG-001',  sku:'EGG-001',  name:'Organic Eggs (crate/30)',cat:'dairy',      price:6000, icon:'🥚', stock:6,  unit:'crate'  },
  { id:30, barcode:'BF-DRY-001',  sku:'DRY-001',  name:'Fresh Whole Milk (1 L)', cat:'dairy',      price:1500, icon:'🥛', stock:18, unit:'litre'  },
  { id:31, barcode:'BF-DRY-002',  sku:'DRY-002',  name:'Greek Yogurt (500 g)',   cat:'dairy',      price:2500, icon:'🍦', stock:12, unit:'pack'   },
  { id:32, barcode:'BF-DRY-003',  sku:'DRY-003',  name:'Butter (250 g)',         cat:'dairy',      price:2000, icon:'🧈', stock:20, unit:'pack'   },
  { id:33, barcode:'BF-BEV-001',  sku:'BEV-001',  name:'Zobo Drink (1 L)',       cat:'beverages',  price:800,  icon:'🧃', stock:30, unit:'bottle' },
  { id:34, barcode:'BF-BEV-002',  sku:'BEV-002',  name:'Kunu (500 ml)',          cat:'beverages',  price:600,  icon:'🥤', stock:25, unit:'bottle' },
  { id:35, barcode:'BF-BEV-003',  sku:'BEV-003',  name:'Bottled Water (1.5 L)',  cat:'beverages',  price:400,  icon:'💧', stock:100,unit:'bottle' },
  { id:36, barcode:'BF-BEV-004',  sku:'BEV-004',  name:'Tigernut Milk (500 ml)', cat:'beverages',  price:1200, icon:'🍶', stock:15, unit:'bottle' },
  { id:37, barcode:'BF-BEV-005',  sku:'BEV-005',  name:'Fresh Orange Juice (500ml)',cat:'beverages',price:1200,icon:'🍊', stock:20, unit:'bottle' },
  { id:38, barcode:'BF-FRM-001',  sku:'FRM-001',  name:'Ginger (250 g)',         cat:'farm',       price:400,  icon:'🫚', stock:40, unit:'pack'   },
  { id:39, barcode:'BF-FRM-002',  sku:'FRM-002',  name:'Garlic (5 bulbs)',       cat:'farm',       price:600,  icon:'🧄', stock:35, unit:'pack'   },
  { id:40, barcode:'BF-FRM-003',  sku:'FRM-003',  name:'Sweet Potatoes (1 kg)',  cat:'farm',       price:700,  icon:'🍠', stock:28, unit:'kg'     },
  { id:41, barcode:'BF-FRM-004',  sku:'FRM-004',  name:'Cassava (1 kg)',         cat:'farm',       price:500,  icon:'🪴', stock:50, unit:'kg'     },
  { id:42, barcode:'BF-FRM-005',  sku:'FRM-005',  name:'Fresh Herb Bundle',      cat:'farm',       price:600,  icon:'🌱', stock:20, unit:'bunch'  },
]
const BY_BARCODE = {}; const BY_SKU = {}
PRODUCTS.forEach(p => { BY_BARCODE[p.barcode] = p; BY_SKU[p.sku] = p })

const MOCK_CUSTOMERS = [
  { id:1, name:'Amara Obi',     phone:'0810 000 1234', tier:'Platinum', points:2450, wallet:5000,  orders:24 },
  { id:2, name:'Tunde Adeyemi', phone:'0802 345 6789', tier:'Gold',     points:1200, wallet:1200,  orders:12 },
  { id:3, name:'Mrs. Okonkwo',  phone:'0706 789 0123', tier:'Platinum', points:3800, wallet:8500,  orders:38 },
  { id:4, name:'Kemi Balogun',  phone:'0817 234 5678', tier:'Silver',   points:620,  wallet:0,     orders:4  },
  { id:5, name:'Seun Abiodun',  phone:'0803 456 7890', tier:'Gold',     points:1700, wallet:3000,  orders:17 },
]
const HISTORY_MOCK = [
  { inv:'BF-INV-1023', cust:'Walk-in',       method:'Cash',     time:'10:45 AM', amount:3500  },
  { inv:'BF-INV-1024', cust:'Amara Obi',     method:'Card/POS', time:'11:10 AM', amount:14200 },
  { inv:'BF-INV-1025', cust:'Mrs. Okonkwo',  method:'Card/POS', time:'12:05 PM', amount:8750  },
  { inv:'BF-INV-1026', cust:'Walk-in',       method:'Cash',     time:'01:20 PM', amount:2400  },
  { inv:'BF-INV-1027', cust:'Tunde Adeyemi', method:'Card/POS', time:'02:05 PM', amount:6600  },
  { inv:'BF-INV-1028', cust:'Kemi Balogun',  method:'Card/POS', time:'02:40 PM', amount:5100  },
]
const ONLINE_ORDERS = [
  { id:'ORD-WEB-4421', channel:'website',   customer:'Amara Obi',       phone:'0810 000 1234', time:'09:14 AM', status:'new',        note:'Please pack neatly, delivery by 12pm', items:[{productId:1,qty:2},{productId:35,qty:4},{productId:9,qty:1}] },
  { id:'ORD-WA-4422',  channel:'whatsapp',  customer:'Mrs. Okonkwo',    phone:'0706 789 0123', time:'10:02 AM', status:'new',        note:'',                                     items:[{productId:2,qty:1},{productId:4,qty:1},{productId:33,qty:2}] },
  { id:'ORD-IG-4423',  channel:'instagram', customer:'Kemi Balogun',    phone:'0817 234 5678', time:'10:45 AM', status:'pending',    note:'Call before dispatch',                 items:[{productId:16,qty:2},{productId:19,qty:1},{productId:28,qty:1}] },
  { id:'ORD-WEB-4424', channel:'website',   customer:'Tunde Adeyemi',   phone:'0802 345 6789', time:'11:30 AM', status:'pending',    note:'',                                     items:[{productId:13,qty:2},{productId:15,qty:1},{productId:37,qty:3}] },
  { id:'ORD-WA-4425',  channel:'whatsapp',  customer:'Seun Abiodun',    phone:'0803 456 7890', time:'12:10 PM', status:'new',        note:'Add extra pepper please',              items:[{productId:3,qty:3},{productId:33,qty:6}] },
  { id:'ORD-PHN-4426', channel:'phone',     customer:'Walk-in Pickup',  phone:'—',             time:'12:55 PM', status:'processing', note:'Paid online, just for pickup',         items:[{productId:5,qty:1},{productId:22,qty:2},{productId:35,qty:2}] },
]
const CHANNEL_META = {
  website:   { label:'Website',   icon:'ri-global-line',    color:'#405189' },
  whatsapp:  { label:'WhatsApp',  icon:'ri-whatsapp-line',  color:'#25d366' },
  instagram: { label:'Instagram', icon:'ri-instagram-line', color:'#e1306c' },
  phone:     { label:'Phone',     icon:'ri-phone-line',     color:'#f7b84b' },
}
const STATUS_META = {
  new:        { label:'New',        color:'#0ab39c', bg:'rgba(10,179,156,.12)'  },
  pending:    { label:'Pending',    color:'#f7b84b', bg:'rgba(247,184,75,.12)'  },
  processing: { label:'Processing', color:'#299cdb', bg:'rgba(41,156,219,.12)'  },
}
const TIER_COLOR = { Platinum:'#a78bfa', Gold:'#f7b84b', Silver:'#94a3b8', Bronze:'#f97316' }
const fmt = n => '₦' + Math.round(n).toLocaleString()
const genOrderId = () => 'BF-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5)
const POS_RETURN_REASONS = ['Damaged on delivery','Wrong item sent','Quality below standard','Spoiled / Already expired','Item missing from order','Incorrect quantity','Customer changed mind','Packaging damaged']

const inp = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',color:'#111827' }
const LBL = { display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4 }
const btnP = { display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#0ab39c',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,padding:'8px 16px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const btnD = { display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#f06548',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }

function Overlay({ onClick }) {
  return <div onClick={onClick} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
}
function ModalBox({ children, maxWidth=460, style={} }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden',maxHeight:'92vh',display:'flex',flexDirection:'column',...style }}>
        {children}
      </div>
    </div>
  )
}
function MHead({ title, onClose, color='#1B4332', icon }) {
  return (
    <div style={{ background:color,color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:12,flexShrink:0 }}>
      {icon&&<div style={{ width:40,height:40,borderRadius:10,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>{icon}</div>}
      <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:15,flex:1 }}>{title}</span>
      <button onClick={onClose} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20,display:'flex',padding:4 }}><i className="ri-close-line"/></button>
    </div>
  )
}

export default function POS() {
  const { user } = useAuth()

  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch]               = useState('')
  const [toast, setToast]                 = useState(null)
  const [toastTimer, setToastTimer]       = useState(null)

  const [onlineOrders, setOnlineOrders]   = useState(ONLINE_ORDERS)
  const [onlineFilter, setOnlineFilter]   = useState('all')
  const [expandedOrder, setExpandedOrder] = useState(null)

  const [customer, setCustomer]           = useState(null)
  const [custSearch, setCustSearch]       = useState('')
  const [showCustPanel, setShowCustPanel] = useState(false)

  const [cart, setCart]                   = useState([])
  const [discountPct, setDiscountPct]     = useState(0)
  const [orderNote, setOrderNote]         = useState('')
  const [highlightId, setHighlightId]     = useState(null)

  const [heldOrders, setHeldOrders]       = useState([])
  const [orderId, setOrderId]             = useState(genOrderId)

  const [activeModal, setActiveModal]     = useState(null)
  const closeModal = () => setActiveModal(null)

  const [scanCart, setScanCart]           = useState([])
  const [scanCode, setScanCode]           = useState('')
  const scanModalInputRef                 = useRef(null)

  const [cashReceived, setCashReceived]   = useState('')
  const [cardTab, setCardTab]             = useState('visa')
  const [bankName, setBankName]           = useState('')
  const [txnRef, setTxnRef]               = useState('')
  const [transferDate, setTransferDate]   = useState('')
  const [splitRows, setSplitRows]         = useState([{ method:'Cash', amount:'' },{ method:'Transfer', amount:'' }])
  const [holdRef, setHoldRef]             = useState('')
  const [holdNote, setHoldNote]           = useState('')
  const [payLaterCust, setPayLaterCust]   = useState('')
  const [payLaterDate, setPayLaterDate]   = useState('')
  const [successData, setSuccessData]     = useState(null)

  const [returnForm, setReturnForm] = useState({ customer:'Walk-in', phone:'', product:PRODUCTS[0], qty:1, unitPrice:PRODUCTS[0].price, reason:POS_RETURN_REASONS[0], notes:'', condition:'resalable', refundMethod:'Cash' })
  const [returnStep, setReturnStep]       = useState(1)
  const [returnLogs, setReturnLogs]       = useState([])
  const [returnSuccess, setReturnSuccess] = useState(null)

  const [txnLastFour, setTxnLastFour]         = useState('')
  const [txnVerifyStatus, setTxnVerifyStatus] = useState('idle') // idle|loading|found|multiple|notfound|error
  const [txnVerifiedData, setTxnVerifiedData] = useState(null)
  const [txnMatches, setTxnMatches]           = useState([])
  const [deleteHoldIdx, setDeleteHoldIdx]     = useState(null)

  const scanInputRef = useRef(null)
  const scanBuffer   = useRef('')
  const lastKeyTime  = useRef(0)
  const onScanRef    = useRef(null)

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

  function showToast(msg, type = 'success', icon = '✅') {
    if (toastTimer) clearTimeout(toastTimer)
    setToast({ msg, type, icon })
    setToastTimer(setTimeout(() => setToast(null), 2500))
  }

  function addProductToCart(product) {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) { showToast(`${product.name} · qty ${ex.qty + 1}`, 'success', product.icon); return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i) }
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
  function clearCart() { setCart([]); setDiscountPct(0); setOrderNote(''); setCustomer(null); setOrderId(genOrderId()) }

  function scannerAddProduct(code) {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    const product = BY_BARCODE[trimmed] || BY_BARCODE['BF-' + trimmed] || BY_SKU[trimmed]
    if (!product) { showToast('Not found: ' + trimmed, 'error', '❌'); return }
    setScanCart(prev => { const ex = prev.find(i => i.id === product.id); if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i); return [...prev, { ...product, qty: 1 }] })
    showToast(`${product.name} scanned`, 'success', product.icon)
    setScanCode(''); setTimeout(() => scanModalInputRef.current?.focus(), 50)
  }
  function scannerUpdateQty(id, qty) {
    if (qty <= 0) { setScanCart(prev => prev.filter(i => i.id !== id)); return }
    setScanCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }
  function scannerAddToOrder() {
    scanCart.forEach(item => { setCart(prev => { const ex = prev.find(i => i.id === item.id); if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + item.qty } : i); return [...prev, { ...item, note: '' }] }) })
    showToast(`${scanCart.length} item(s) added to order`, 'success', '🛒'); setScanCart([]); closeModal()
  }
  function scannerQuickPay() {
    scanCart.forEach(item => { setCart(prev => { const ex = prev.find(i => i.id === item.id); if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + item.qty } : i); return [...prev, { ...item, note: '' }] }) })
    setScanCart([]); setTimeout(() => setActiveModal('cash'), 50)
  }

  function loadOnlineOrderToCart(order) {
    let loaded = 0
    order.items.forEach(({ productId, qty }) => {
      const product = PRODUCTS.find(p => p.id === productId)
      if (!product) return
      setCart(prev => { const ex = prev.find(i => i.id === product.id); if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + qty } : i); return [...prev, { ...product, qty, note: '' }] })
      loaded++
    })
    const matched = MOCK_CUSTOMERS.find(c => c.name === order.customer)
    if (matched) setCustomer(matched)
    setOnlineOrders(prev => prev.map(o => o.id === order.id ? { ...o, status:'processing' } : o))
    showToast(`${loaded} item(s) from ${order.id} loaded to cart`, 'success', '📥'); closeModal()
  }

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

  const subtotal    = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const discountAmt = Math.round(subtotal * discountPct / 100)
  const taxable     = subtotal - discountAmt
  const vat         = Math.round(taxable * 0.075)
  const total       = taxable + vat
  const itemCount   = cart.reduce((s, i) => s + i.qty, 0)
  const cashChange  = cashReceived ? Math.max(0, Number(cashReceived) - total) : 0

  function confirmPayment(method) {
    setSuccessData({ orderId, customer, cart: [...cart], subtotal, discountAmt, vat, total, discountPct, method, paidAt: new Date(), verifiedTxn: txnVerifiedData })
    if (txnVerifiedData?.id) {
      api.patch(`/admin/pos/verify-payment/${txnVerifiedData.id}/use`).catch(() => {})
    }
    closeModal(); setTimeout(() => setActiveModal('success'), 80)
  }
  function newOrder() { closeModal(); clearCart(); setCashReceived(''); clearVerification() }
  function numpadPress(v) { setCashReceived(prev => { if (v==='⌫') return prev.slice(0,-1); if (v==='C') return ''; if (v==='.'&&prev.includes('.')) return prev; return prev+v }) }

  const products = useMemo(() => {
    let list = activeCategory === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.cat === activeCategory)
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q)) }
    return list
  }, [activeCategory, search])

  const filteredCustomers = custSearch.trim()
    ? MOCK_CUSTOMERS.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.phone.includes(custSearch))
    : MOCK_CUSTOMERS

  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 10000); return () => clearInterval(t) }, [])

  function addSplitRow() { setSplitRows(r => [...r, { method:'Cash', amount:'' }]) }
  function updateSplit(i, field, val) { setSplitRows(r => r.map((row, ri) => ri === i ? { ...row, [field]: val } : row)) }

  async function verifyTransaction() {
    if (txnLastFour.length < 4) return
    setTxnVerifyStatus('loading')
    try {
      const { data } = await api.post('/admin/pos/verify-payment', { last_four: txnLastFour, amount: total })
      const { matches } = data
      if (!matches.length) {
        setTxnVerifyStatus('notfound')
      } else if (matches.length === 1) {
        setTxnVerifiedData(matches[0]); setTxnVerifyStatus('found')
      } else {
        setTxnMatches(matches); setTxnVerifyStatus('multiple')
      }
    } catch { setTxnVerifyStatus('error') }
  }
  function selectVerifiedTxn(txn) { setTxnVerifiedData(txn); setTxnVerifyStatus('found'); setTxnMatches([]) }
  function clearVerification() { setTxnLastFour(''); setTxnVerifyStatus('idle'); setTxnVerifiedData(null); setTxnMatches([]) }
  function deleteHeldOrder(idx) { setHeldOrders(prev => prev.filter((_,i) => i !== idx)); setDeleteHoldIdx(null) }

  const B = '#e5e7eb'   // border
  const S = '#6b7280'   // secondary text
  const BG2 = '#f9fafb' // secondary bg

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', background:'#f3f4f6', fontFamily:'Nunito,sans-serif' }}>

      {/* TOPBAR */}
      <header style={{ height:58, flexShrink:0, display:'flex', alignItems:'center', padding:'0 16px', zIndex:200, background:'#fff', borderBottom:`1px solid ${B}` }}>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, fontWeight:800, fontSize:15, color:'#0ab39c' }}>
          <span style={{ fontSize:24 }}>🌾</span>
          <span style={{ lineHeight:1.2 }}>Bems Farms<br/><span style={{ fontSize:9, fontWeight:500, color:S, letterSpacing:1 }}>POINT OF SALE</span></span>
        </div>
        <div style={{ position:'relative', width:'100%', maxWidth:520 }}>
          <i className="ri-search-line" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#0ab39c', fontSize:15, pointerEvents:'none' }}/>
          <input id="scan-field" ref={scanInputRef} type="text" placeholder="Search products  ·  or scan / type barcode + Enter" autoComplete="off"
            value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key==='Enter'&&search.trim()) handleBarcodeScan(search) }}
            style={{ width:'100%', height:38, paddingLeft:38, paddingRight:96, border:'2px solid #0ab39c', borderRadius:8, fontSize:13, background:'#fff', color:'#111827', outline:'none', boxShadow:'0 0 0 3px rgba(10,179,156,.1)', boxSizing:'border-box' }}/>
          {search
            ? <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:S, fontSize:16 }}>✕</button>
            : <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:9, color:'#0ab39c', fontWeight:700, letterSpacing:.5, pointerEvents:'none' }}>SCANNER READY</span>
          }
        </div>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
          <div style={{ fontSize:12, color:S, textAlign:'right' }}>
            <div style={{ fontWeight:600 }}>{now.toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'})}</div>
            <div style={{ fontSize:10 }}>{now.toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})}</div>
          </div>
          {heldOrders.length > 0 && (
            <button onClick={() => setActiveModal('heldOrders')} style={{ position:'relative', fontSize:11, padding:'4px 12px', borderRadius:8, border:'2px solid #f7b84b', background:'#f7b84b', color:'#111827', cursor:'pointer', fontWeight:700 }}>
              ⏸️ {heldOrders.length} Held
              <span style={{ position:'absolute', top:-7, right:-7, width:16, height:16, borderRadius:'50%', background:'#f06548', color:'#fff', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{heldOrders.length}</span>
            </button>
          )}
          <Link to="/dashboard" style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:8, border:`1.5px solid ${B}`, background:'#fff', color:'#374151', textDecoration:'none', fontSize:12, fontWeight:600 }}>
            <i className="ri-dashboard-2-line"/>Exit
          </Link>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'#0ab39c', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:12 }}>
            {user ? (user.first_name?.[0]||'') + (user.last_name?.[0]||'') : 'AS'}
          </div>
        </div>
      </header>

      {/* BODY */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* LEFT: Products */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', borderRight:`1px solid ${B}`, background:'#fff' }}>

          {/* Quick action cards */}
          <div style={{ padding:'10px 16px', borderBottom:`1px solid ${B}`, background:BG2, flexShrink:0, display:'flex', gap:10 }}>
            {[
              { label:'Scan Basket',    sub:'Scan barcodes to build order',         icon:'ri-barcode-line',       color:'#0ab39c', badge: scanCart.length||null,  onClick:()=>{ setScanCart([]); setScanCode(''); setActiveModal('scanner') } },
              { label:'Online Orders',  sub:'Import incoming orders to cart',        icon:'ri-shopping-bag-3-line',color:'#405189', badge: onlineOrders.filter(o=>o.status==='new').length||null, badgeLabel:'new', onClick:()=>setActiveModal('online') },
              { label:'Goods Return',   sub:'Process a customer return & refund',    icon:'ri-arrow-go-back-line', color:'#f06548', badge: returnLogs.length||null, onClick:()=>{ setReturnForm(f=>({...f,product:PRODUCTS[0],unitPrice:PRODUCTS[0].price,qty:1,customer:'Walk-in',phone:'',notes:'',condition:'resalable',refundMethod:'Cash',reason:POS_RETURN_REASONS[0]})); setReturnStep(1); setReturnSuccess(null); setActiveModal('return') } },
            ].map(c => (
              <button key={c.label} onClick={c.onClick}
                style={{ flex:1, display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:14, border:`1px solid ${c.color}28`, background:'#fff', cursor:'pointer', textAlign:'left', boxShadow:`0 2px 8px ${c.color}18` }}>
                <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${c.color},${c.color}bb)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 4px 12px ${c.color}44` }}>
                  <i className={c.icon} style={{ fontSize:22, color:'#fff' }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#111827', letterSpacing:.2 }}>{c.label}</div>
                  <div style={{ fontSize:11, color:S, marginTop:2 }}>{c.sub}</div>
                </div>
                {c.badge
                  ? <span style={{ background:c.color, color:'#fff', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, flexShrink:0 }}>{c.badge}{c.badgeLabel?' '+c.badgeLabel:''}</span>
                  : <i className="ri-arrow-right-s-line" style={{ fontSize:18, color:c.color, flexShrink:0 }}/>
                }
              </button>
            ))}
          </div>

          {/* Category pills */}
          <div style={{ padding:'10px 16px', borderBottom:`1px solid ${B}`, display:'flex', gap:6, overflowX:'auto', flexShrink:0, scrollbarWidth:'none' }}>
            {CATEGORIES.map(cat => {
              const active = activeCategory === cat.id; const color = CAT_COLORS[cat.id]
              return (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, border:`2px solid ${active?color:B}`, background: active?color:'transparent', color: active?'#fff':'#111827', fontSize:12, fontWeight:600, whiteSpace:'nowrap', cursor:'pointer', flexShrink:0 }}>
                  <span style={{ fontSize:15 }}>{cat.emoji}</span>{cat.label}
                </button>
              )
            })}
          </div>

          {/* Product grid */}
          <div style={{ flex:1, overflowY:'auto', padding:12, background:BG2 }}>
            {products.length === 0
              ? <div style={{ textAlign:'center', padding:'60px 0', color:S }}><div style={{ fontSize:52 }}>🔍</div><p style={{ marginTop:12 }}>No products found</p></div>
              : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(145px,1fr))', gap:10 }}>
                  {products.map(p => {
                    const color = CAT_COLORS[p.cat]||'#405189'; const low=p.stock>0&&p.stock<=5; const out=p.stock===0; const inCart=cart.find(i=>i.id===p.id)
                    return (
                      <button key={p.id} onClick={() => !out && addProductToCart(p)} disabled={out}
                        style={{ border: inCart?`2px solid ${color}`:`1px solid ${B}`, borderRadius:10, padding:12, background:'#fff', cursor:out?'not-allowed':'pointer', opacity:out?.45:1, textAlign:'left', position:'relative', boxShadow: inCart?`0 0 0 3px ${color}25`:'0 1px 3px rgba(0,0,0,.06)' }}>
                        {inCart && <div style={{ position:'absolute', top:-7, right:-7, width:20, height:20, borderRadius:'50%', background:color, color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{inCart.qty}</div>}
                        {low&&!out&&<div style={{ position:'absolute', top:6, left:6, fontSize:8, fontWeight:700, color:'#f7b84b', textTransform:'uppercase' }}>Low</div>}
                        <div style={{ height:64, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:`${color}18`, fontSize:36, marginBottom:8 }}>{p.icon}</div>
                        <div style={{ fontSize:11, fontWeight:600, lineHeight:1.3, marginBottom:4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{p.name}</div>
                        <div style={{ fontSize:9, color:S, marginBottom:6 }}>{p.sku} · per {p.unit}</div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:13, fontWeight:800, color }}>{fmt(p.price)}</span>
                          <span style={{ fontSize:9, color:p.stock<=5?'#f06548':S }}>{p.stock} left</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
            }
          </div>
        </div>

        {/* RIGHT: Order Panel */}
        <div style={{ width:500, flexShrink:0, display:'flex', flexDirection:'column', overflow:'hidden', background:'#fff' }}>

          {/* Held orders strip */}
          {heldOrders.length > 0 && (
            <div style={{ padding:'8px 12px', background:'linear-gradient(90deg,#f7b84b18,#f7b84b08)', borderBottom:'2px solid #f7b84b50', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <button onClick={() => setActiveModal('heldOrders')}
                style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}>
                <span style={{ width:26, height:26, borderRadius:'50%', background:'#f7b84b', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#111827' }}>⏸</span>
                <span style={{ fontSize:11, color:'#92400e', fontWeight:800 }}>{heldOrders.length} HELD</span>
              </button>
              <div style={{ flex:1, display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none' }}>
                {heldOrders.map((h,i) => (
                  <button key={i} onClick={() => recallOrder(i)}
                    style={{ fontSize:10, padding:'3px 10px', borderRadius:10, border:'1.5px solid #f7b84b80', background:'#fff', cursor:'pointer', color:'#111827', whiteSpace:'nowrap', fontWeight:600, flexShrink:0 }}>
                    {h.ref||`#${i+1}`} · {h.customer?.name?.split(' ')[0]||'Walk-in'} · {fmt(h.cart.reduce((s,ci)=>s+ci.price*ci.qty,0))}
                  </button>
                ))}
              </div>
              <button onClick={() => setActiveModal('heldOrders')}
                style={{ fontSize:10, padding:'4px 10px', borderRadius:8, border:'1.5px solid #f7b84b', background:'transparent', cursor:'pointer', color:'#92400e', fontWeight:700, flexShrink:0, display:'flex', alignItems:'center', gap:3 }}>
                Manage <i className="ri-arrow-right-s-line"/>
              </button>
            </div>
          )}

          {/* Order header */}
          <div style={{ padding:'10px 14px', borderBottom:`1px solid ${B}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:'#0ab39c0f' }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#0ab39c' }}>{orderId}</div>
              <div style={{ fontSize:10, color:S }}>{itemCount} item{itemCount!==1?'s':''} · {fmt(total)}</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setShowCustPanel(!showCustPanel)}
                style={{ fontSize:11, padding:'4px 10px', border:`1px solid ${B}`, borderRadius:6, background:'transparent', cursor:'pointer', color:customer?'#0ab39c':'inherit' }}>
                {customer ? `👤 ${customer.name.split(' ')[0]}` : '👤 Return Cart'}
              </button>
              {cart.length > 0 && <button onClick={clearCart} style={{ fontSize:10, padding:'4px 8px', border:'1px solid #f06548', borderRadius:6, background:'transparent', cursor:'pointer', color:'#f06548' }}>Clear</button>}
            </div>
          </div>

          {/* Customer panel */}
          {showCustPanel && (
            <div style={{ padding:12, borderBottom:`1px solid ${B}`, background:BG2 }}>
              <input type="text" placeholder="Search return cart…" value={custSearch} onChange={e => setCustSearch(e.target.value)}
                style={{ ...inp, height:32, padding:'0 10px', marginBottom:8 }}/>
              <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:140, overflowY:'auto' }}>
                {filteredCustomers.map(c => (
                  <button key={c.id} onClick={() => { setCustomer(c); setShowCustPanel(false); setCustSearch('') }}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', border: customer?.id===c.id?'1.5px solid #0ab39c':`1px solid ${B}`, borderRadius:8, background: customer?.id===c.id?'#0ab39c10':'#fff', cursor:'pointer', textAlign:'left' }}>
                    <div><div style={{ fontSize:12, fontWeight:600 }}>{c.name}</div><div style={{ fontSize:10, color:S }}>{c.phone}</div></div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:TIER_COLOR[c.tier] }}>{c.tier}</div>
                      <div style={{ fontSize:9, color:S }}>{c.points.toLocaleString()} pts</div>
                    </div>
                  </button>
                ))}
              </div>
              {customer && <button onClick={() => { setCustomer(null); setShowCustPanel(false) }} style={{ width:'100%', marginTop:6, padding:'4px 0', fontSize:11, border:'1px solid #f06548', borderRadius:6, background:'transparent', cursor:'pointer', color:'#f06548' }}>Remove Return Cart</button>}
            </div>
          )}

          {/* Customer bar */}
          {customer && !showCustPanel && (
            <div style={{ padding:'8px 14px', background:'#0ab39c10', borderBottom:'1px solid #0ab39c30', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:TIER_COLOR[customer.tier], display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:11, flexShrink:0 }}>
                {customer.name.split(' ').map(n=>n[0]).join('')}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700 }}>{customer.name}</div>
                <div style={{ fontSize:10, color:S }}>
                  <span style={{ color:TIER_COLOR[customer.tier], fontWeight:600 }}>{customer.tier}</span>
                  {' · '}{customer.points.toLocaleString()} pts
                  {' · '}<span style={{ color:'#0ab39c' }}>Wallet {fmt(customer.wallet)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cart items */}
          <div style={{ flex:1, overflowY:'auto', padding:'4px 0' }}>
            {cart.length === 0
              ? <div style={{ textAlign:'center', padding:'50px 20px', color:S }}>
                  <div style={{ fontSize:44 }}>🛒</div>
                  <p style={{ marginTop:10, fontSize:13 }}>Scan a barcode or tap a product<br/>to start the order</p>
                  <div style={{ marginTop:16, padding:'8px 14px', background:'#0ab39c10', borderRadius:8, border:'1px dashed #0ab39c50', fontSize:11, color:'#0ab39c' }}>
                    💡 Point scanner at a barcode and it<br/>will appear here automatically
                  </div>
                </div>
              : cart.map(item => {
                  const color = CAT_COLORS[item.cat]||'#405189'; const isHighlit = highlightId === item.id
                  return (
                    <div key={item.id} style={{ padding:'8px 14px', borderBottom:`1px solid ${B}`, background: isHighlit?`${color}18`:'transparent', transition:'background .4s' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:22, flexShrink:0 }}>{item.icon}</span>
                        <div style={{ flex:1, overflow:'hidden' }}>
                          <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                          <div style={{ fontSize:10, color:S }}>{fmt(item.price)}/{item.unit}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                          <button onClick={() => updateQty(item.id, item.qty-1)} style={{ width:22, height:22, borderRadius:'50%', border:`1px solid ${B}`, background:'transparent', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                          <input type="number" min="1" value={item.qty} onChange={e => updateQty(item.id, parseInt(e.target.value)||1)}
                            style={{ width:36, height:24, textAlign:'center', border:`1px solid ${B}`, borderRadius:4, fontSize:12, fontWeight:700, background:'#fff', color:'#111827', outline:'none' }}/>
                          <button onClick={() => updateQty(item.id, item.qty+1)} style={{ width:22, height:22, borderRadius:'50%', border:`1px solid ${B}`, background:'transparent', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                        </div>
                        <div style={{ minWidth:60, textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color }}>{fmt(item.price*item.qty)}</div>
                          <button onClick={() => updateQty(item.id,0)} style={{ fontSize:10, color:'#f06548', background:'none', border:'none', cursor:'pointer', padding:0 }}><i className="ri-delete-bin-line"/> remove</button>
                        </div>
                      </div>
                      <input type="text" placeholder="+ Item note…" value={item.note} onChange={e => updateNote(item.id, e.target.value)}
                        style={{ width:'100%', height:26, marginTop:4, padding:'0 8px', fontSize:10, border:`1px dashed ${B}`, borderRadius:4, background:'transparent', color:S, outline:'none', boxSizing:'border-box' }}/>
                    </div>
                  )
                })
            }
          </div>

          {/* Order note */}
          {cart.length > 0 && (
            <div style={{ padding:'6px 14px', borderTop:`1px solid ${B}` }}>
              <input type="text" placeholder="📝 Order note…" value={orderNote} onChange={e => setOrderNote(e.target.value)}
                style={{ ...inp, height:30, padding:'0 10px', fontSize:11 }}/>
            </div>
          )}

          {/* Transaction ID Verification */}
          <div style={{ padding:'8px 14px', borderTop:`1px solid ${B}`, background: txnVerifyStatus==='found'?'rgba(10,179,156,.03)':txnVerifyStatus==='notfound'||txnVerifyStatus==='error'?'rgba(240,101,72,.03)':'transparent' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <i className="ri-secure-payment-line" style={{ fontSize:13, color:txnVerifyStatus==='found'?'#0ab39c':S }}/>
                <span style={{ fontSize:10, fontWeight:700, color:txnVerifyStatus==='found'?'#0ab39c':S, textTransform:'uppercase', letterSpacing:.5 }}>Transaction ID</span>
                {txnVerifyStatus==='found' && <span style={{ fontSize:9, background:'#dcfce7', color:'#166534', borderRadius:20, padding:'1px 7px', fontWeight:700 }}>VERIFIED ✓</span>}
              </div>
              {txnVerifyStatus !== 'idle' && (
                <button onClick={clearVerification} style={{ background:'none', border:'none', cursor:'pointer', fontSize:10, color:S, display:'flex', alignItems:'center', gap:3 }}>
                  <i className="ri-refresh-line"/>Clear
                </button>
              )}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <input
                type="text" maxLength={4} placeholder="Last 4 digits · e.g. 4521"
                value={txnLastFour}
                onChange={e => { const v=e.target.value.replace(/\D/g,'').slice(0,4); setTxnLastFour(v); if(txnVerifyStatus!=='idle'){setTxnVerifyStatus('idle');setTxnVerifiedData(null);setTxnMatches([])} }}
                onKeyDown={e => e.key==='Enter' && txnLastFour.length===4 && verifyTransaction()}
                style={{ ...inp, height:32, flex:1, letterSpacing:6, textAlign:'center', fontWeight:700, fontSize:14,
                  borderColor: txnVerifyStatus==='found'?'#0ab39c':txnVerifyStatus==='notfound'||txnVerifyStatus==='error'?'#f06548':'#e5e7eb',
                  background: txnVerifyStatus==='found'?'#f0fdf4':txnVerifyStatus==='notfound'||txnVerifyStatus==='error'?'#fef2f2':'#fff' }}
              />
              <button
                onClick={verifyTransaction}
                disabled={txnLastFour.length < 4 || txnVerifyStatus==='loading' || txnVerifyStatus==='found'}
                style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'0 12px', height:32, borderRadius:8, border:'none',
                  background: txnVerifyStatus==='found'?'#0ab39c':'#405189', color:'#fff',
                  cursor: txnLastFour.length<4||txnVerifyStatus==='found'?'not-allowed':'pointer',
                  fontSize:12, fontWeight:700, fontFamily:'Nunito,sans-serif', opacity:txnLastFour.length<4&&txnVerifyStatus!=='found'?0.5:1, flexShrink:0 }}>
                {txnVerifyStatus==='loading' ? <><i className="ri-loader-4-line"/>Checking…</>
                  : txnVerifyStatus==='found'  ? <><i className="ri-check-double-line"/>Verified</>
                  : <><i className="ri-search-line"/>Verify</>}
              </button>
            </div>

            {txnVerifyStatus==='notfound' && (
              <div style={{ marginTop:6, padding:'6px 10px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:6, fontSize:11, color:'#991b1b', display:'flex', alignItems:'center', gap:6 }}>
                <i className="ri-close-circle-line"/>No transaction ending in ****{txnLastFour} found. Please check and retry.
              </div>
            )}
            {txnVerifyStatus==='error' && (
              <div style={{ marginTop:6, padding:'6px 10px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:6, fontSize:11, color:'#991b1b', display:'flex', alignItems:'center', gap:6 }}>
                <i className="ri-wifi-off-line"/>Verification failed — check connection and try again.
              </div>
            )}
            {txnVerifyStatus==='multiple' && (
              <div style={{ marginTop:6, padding:'8px 10px', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:6, fontSize:11 }}>
                <div style={{ color:'#92400e', fontWeight:700, marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                  <i className="ri-error-warning-line"/>{txnMatches.length} transactions match — select the correct one:
                </div>
                {txnMatches.map(t => (
                  <div key={t.id} onClick={() => selectVerifiedTxn(t)}
                    style={{ padding:'6px 10px', background:'#fff', border:'1.5px solid #e5e7eb', borderRadius:6, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:12 }}>{t.transaction_id}</div>
                      <div style={{ fontSize:10, color:S }}>{new Date(t.payment_time).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'})} · {t.payment_method||'—'}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:700, fontSize:13, color:'#0ab39c' }}>{fmt(t.amount)}</div>
                      {t.customer_name && <div style={{ fontSize:10, color:S }}>{t.customer_name}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {txnVerifyStatus==='found' && txnVerifiedData && (
              <div style={{ marginTop:6, padding:'8px 10px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, color:'#166534', fontWeight:700, fontSize:11 }}>
                  <i className="ri-checkbox-circle-fill" style={{ fontSize:14, color:'#0ab39c' }}/>Payment successfully verified — linked to this sale
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3px 12px', fontSize:11 }}>
                  {[
                    ['Full Txn ID', txnVerifiedData.transaction_id],
                    ['Amount Paid', fmt(txnVerifiedData.amount)],
                    ['Method', txnVerifiedData.payment_method||'—'],
                    ['Time', new Date(txnVerifiedData.payment_time).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'})],
                    txnVerifiedData.customer_name ? ['Payer', txnVerifiedData.customer_name] : null,
                    ['Status', txnVerifiedData.status],
                  ].filter(Boolean).map(([k,v]) => (
                    <div key={k} style={{ display:'flex', gap:4 }}>
                      <span style={{ color:'#6b7280' }}>{k}:</span>
                      <span style={{ fontWeight:600, color:'#111827' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Discount */}
          <div style={{ padding:'6px 14px', borderTop:`1px solid ${B}`, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:10, fontWeight:700, color:S, textTransform:'uppercase', letterSpacing:.5 }}>Discount</span>
            {[0,5,10,15,20].map(d => (
              <button key={d} onClick={() => setDiscountPct(d)}
                style={{ fontSize:10, padding:'2px 8px', borderRadius:10, border: discountPct===d?'none':`1px solid ${B}`, background: discountPct===d?'#0ab39c':'transparent', color: discountPct===d?'#fff':'#111827', cursor:'pointer', fontWeight:discountPct===d?700:400 }}>
                {d===0?'None':d+'%'}
              </button>
            ))}
          </div>

          {/* Totals */}
          <div style={{ padding:'8px 14px', borderTop:`1px solid ${B}`, background:BG2 }}>
            {[
              { label:'Subtotal',                   value:fmt(subtotal),          show:true           },
              { label:`Discount (${discountPct}%)`, value:'− '+fmt(discountAmt),  show:discountPct>0, color:'#f06548' },
              { label:'VAT (7.5%)',                 value:fmt(vat),               show:true,          color:S },
            ].filter(r=>r.show).map(r=>(
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:11, color:S }}>{r.label}</span>
                <span style={{ fontSize:11, fontWeight:600, color:r.color||'inherit' }}>{r.value}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6, borderTop:`2px solid ${B}`, marginTop:4 }}>
              <span style={{ fontSize:14, fontWeight:800 }}>Total Payable</span>
              <span style={{ fontSize:17, fontWeight:900, color:'#0ab39c' }}>{fmt(total)}</span>
            </div>
          </div>

          {/* Payment methods */}
          <div style={{ padding:'12px 14px', borderTop:`2px solid ${B}`, background:BG2 }}>
            <div style={{ fontSize:10, fontWeight:700, color:S, textTransform:'uppercase', letterSpacing:.8, marginBottom:10 }}>Select Payment Method</div>
            {txnLastFour.length > 0 && txnVerifyStatus !== 'found' && (
              <div style={{ marginBottom:10, padding:'6px 10px', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:8, fontSize:11, color:'#92400e', display:'flex', alignItems:'center', gap:6 }}>
                <i className="ri-lock-line" style={{ fontSize:13 }}/>Transaction ID entered but not verified — verify above before checkout
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              {(() => {
                const payBlocked = txnLastFour.length > 0 && txnVerifyStatus !== 'found'
                return [
                  { id:'cash',     label:'Cash',          sub:'Notes & coins',    icon:'ri-money-dollar-circle-line', color:'#0ab39c' },
                  { id:'card',     label:'Card / POS',    sub:'External terminal',icon:'ri-bank-card-line',           color:'#405189' },
                ].map(m => {
                  const disabled = cart.length===0 || payBlocked
                  return (
                <button key={m.id} disabled={disabled} onClick={() => {
                  if (!cart.length) return
                  if (payBlocked) { showToast('Verify the transaction ID before checkout','error','🔐'); return }
                  setActiveModal(m.id)
                }}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 8px', borderRadius:12, border:`1.5px solid ${disabled?B:m.color+'50'}`, background: disabled?'#fff':`${m.color}12`, cursor:disabled?'not-allowed':'pointer', opacity:disabled?.45:1 }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:`${m.color}20`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className={m.icon} style={{ fontSize:20, color:m.color }}/>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#111827', lineHeight:1.2 }}>{m.label}</div>
                    <div style={{ fontSize:9, color:S, marginTop:2 }}>{m.sub}</div>
                  </div>
                </button>
                  )
                })
              })()}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, background:'rgba(64,81,137,.08)', border:'1px dashed rgba(64,81,137,.3)' }}>
              <i className="ri-information-line" style={{ color:'#405189', fontSize:14, flexShrink:0 }}/>
              <span style={{ fontSize:10, color:S, lineHeight:1.4 }}>Card payments use an <strong style={{ color:'#405189' }}>external POS terminal</strong>. Process on the device, then confirm here to record.</span>
            </div>
          </div>

          {/* Quick actions bar */}
          <div style={{ display:'flex', borderTop:`1px solid ${B}`, background:'#fff' }}>
            {[
              { label:'Hold',    icon:'ri-pause-circle-line',   color:'#0ab39c', modal:'hold'     },
              { label:'Invoice', icon:'ri-file-text-line',      color:'#f06548', modal:'invoice'  },
              { label:'Pay Later',icon:'ri-time-line',          color:'#f7b84b', modal:'paylater' },
              { label:'History', icon:'ri-folder-history-line', color:'#299cdb', modal:'history'  },
            ].map(b => (
              <button key={b.label} onClick={() => setActiveModal(b.modal)}
                style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'10px 4px', background:'transparent', border:'none', cursor:'pointer' }}>
                <span style={{ width:32, height:32, borderRadius:'50%', background:`${b.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className={b.icon} style={{ fontSize:15, color:b.color }}/>
                </span>
                <span style={{ fontSize:10, fontWeight:600, color:S }}>{b.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ MODALS ═══════════════════════════════════════════════════════════ */}
      {activeModal && activeModal!=='success' && <Overlay onClick={closeModal}/>}

      {/* SCANNER BASKET */}
      {activeModal==='scanner' && (() => {
        const scSub=scanCart.reduce((s,i)=>s+i.price*i.qty,0), scVat=Math.round(scSub*.075), scTotal=scSub+scVat
        return (
          <ModalBox maxWidth={780}>
            <MHead title="Scan Basket" onClose={()=>{ setScanCart([]); closeModal() }} color="linear-gradient(135deg,#0ab39c,#405189)" icon="🛒"/>
            <div style={{ padding:'16px 20px', borderBottom:`1px solid ${B}`, background:BG2, flexShrink:0 }}>
              <div style={{ display:'flex', gap:0, borderRadius:8, overflow:'hidden', border:`1.5px solid #0ab39c` }}>
                <span style={{ background:'#0ab39c', color:'#fff', display:'flex', alignItems:'center', padding:'0 16px', fontSize:20 }}><i className="ri-barcode-line"/></span>
                <input ref={scanModalInputRef} type="text" placeholder="Scan barcode or type SKU + Enter…" value={scanCode} autoFocus autoComplete="off"
                  onChange={e => setScanCode(e.target.value)} onKeyDown={e => { if (e.key==='Enter') scannerAddProduct(scanCode) }}
                  style={{ flex:1, border:'none', outline:'none', padding:'10px 14px', fontSize:15, fontWeight:500, fontFamily:'Nunito,sans-serif', color:'#111827' }}/>
                <button onClick={() => scannerAddProduct(scanCode)} style={{ ...btnP, borderRadius:0, padding:'0 20px' }}><i className="ri-add-line"/>Add</button>
              </div>
            </div>
            <div style={{ minHeight:280, maxHeight:'45vh', overflowY:'auto' }}>
              {scanCart.length===0
                ? <div style={{ textAlign:'center', padding:'70px 20px', color:S }}><div style={{ fontSize:68 }}>📦</div><div style={{ marginTop:14, fontWeight:700, fontSize:17 }}>No items scanned yet</div><div style={{ fontSize:13, marginTop:6 }}>Scan a barcode or type a SKU above</div></div>
                : scanCart.map((item,idx) => {
                    const color = CAT_COLORS[item.cat]||'#0ab39c'
                    return (
                      <div key={item.id} style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 20px', borderBottom:`1px solid ${B}` }}>
                        <div style={{ width:52, height:52, borderRadius:12, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>{item.icon}</div>
                        <div style={{ flex:1, overflow:'hidden' }}>
                          <div style={{ fontWeight:600, fontSize:15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</div>
                          <div style={{ fontSize:12, color:S, marginTop:2 }}>{item.sku} · {fmt(item.price)} per {item.unit}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                          <button onClick={() => scannerUpdateQty(item.id,item.qty-1)} style={{ width:36, height:36, borderRadius:8, border:`1px solid ${B}`, background:'#fff', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                          <span style={{ minWidth:32, textAlign:'center', fontWeight:800, fontSize:17 }}>{item.qty}</span>
                          <button onClick={() => scannerUpdateQty(item.id,item.qty+1)} style={{ width:36, height:36, borderRadius:8, border:`1px solid ${B}`, background:'#fff', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                        </div>
                        <div style={{ minWidth:100, textAlign:'right', fontWeight:800, fontSize:16, flexShrink:0 }}>{fmt(item.price*item.qty)}</div>
                        <button onClick={() => scannerUpdateQty(item.id,0)} style={{ background:'none', border:'none', cursor:'pointer', color:'#f06548', fontSize:20, flexShrink:0 }}><i className="ri-delete-bin-6-line"/></button>
                      </div>
                    )
                  })
              }
            </div>
            {scanCart.length>0 && (
              <div style={{ padding:'16px 20px', borderTop:`2px solid ${B}`, background:BG2, flexShrink:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13, color:S }}><span>Subtotal ({scanCart.reduce((s,i)=>s+i.qty,0)} items)</span><span>{fmt(scSub)}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, fontSize:13, color:S }}><span>VAT (7.5%)</span><span>{fmt(scVat)}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}><span style={{ fontWeight:700, fontSize:18 }}>Total</span><span style={{ fontWeight:900, fontSize:24, color:'#0ab39c' }}>{fmt(scTotal)}</span></div>
                <div style={{ display:'flex', gap:12 }}>
                  <button style={{ ...btnL, flex:1, padding:'14px' }} onClick={scannerAddToOrder}><i className="ri-add-circle-line" style={{ fontSize:18 }}/>Add to Order</button>
                  <button style={{ ...btnP, flex:1, padding:'14px' }} onClick={scannerQuickPay}><i className="ri-secure-payment-line" style={{ fontSize:18 }}/>Quick Pay</button>
                </div>
                <div style={{ textAlign:'center', fontSize:11, color:S, marginTop:10 }}><b>Add to Order</b> — merges into current order · <b>Quick Pay</b> — goes straight to payment</div>
              </div>
            )}
          </ModalBox>
        )
      })()}

      {/* ONLINE ORDERS */}
      {activeModal==='online' && (
        <ModalBox maxWidth={820} style={{ maxHeight:'90vh' }}>
          <MHead title="Online Orders" onClose={closeModal} color="linear-gradient(135deg,#405189,#0ab39c)" icon="📥"/>
          <div style={{ display:'flex', borderBottom:`1px solid ${B}`, background:'#fff', flexShrink:0 }}>
            {[
              { key:'all',        label:'All Orders',   count:onlineOrders.length },
              { key:'new',        label:'🔴 New',        count:onlineOrders.filter(o=>o.status==='new').length },
              { key:'pending',    label:'🟡 Pending',    count:onlineOrders.filter(o=>o.status==='pending').length },
              { key:'processing', label:'🔵 Processing', count:onlineOrders.filter(o=>o.status==='processing').length },
            ].map(tab => (
              <button key={tab.key} onClick={() => setOnlineFilter(tab.key)}
                style={{ flex:1, padding:'12px 8px', border:'none', borderBottom: onlineFilter===tab.key?'3px solid #405189':'3px solid transparent', background:'transparent', fontWeight:onlineFilter===tab.key?700:500, fontSize:13, color:onlineFilter===tab.key?'#405189':S, cursor:'pointer' }}>
                {tab.label} <span style={{ marginLeft:4, background:onlineFilter===tab.key?'#405189':B, color:onlineFilter===tab.key?'#fff':S, borderRadius:20, padding:'1px 8px', fontSize:11 }}>{tab.count}</span>
              </button>
            ))}
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {onlineOrders.filter(o=>onlineFilter==='all'||o.status===onlineFilter).map(order => {
              const ch=CHANNEL_META[order.channel], st=STATUS_META[order.status]
              const orderTotal=order.items.reduce((s,{productId,qty})=>{ const p=PRODUCTS.find(x=>x.id===productId); return s+(p?p.price*qty:0) },0)
              const isExpanded=expandedOrder===order.id
              return (
                <div key={order.id} style={{ borderBottom:`1px solid ${B}`, padding:'16px 20px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:`${ch.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <i className={ch.icon} style={{ fontSize:22, color:ch.color }}/>
                    </div>
                    <div style={{ flex:1, overflow:'hidden' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontWeight:700, fontSize:14 }}>{order.id}</span>
                        <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20, background:st.bg, color:st.color, fontWeight:700 }}>{st.label}</span>
                        <span style={{ fontSize:11, color:S }}><i className={ch.icon}/> {ch.label}</span>
                      </div>
                      <div style={{ fontSize:13, marginTop:3 }}><span style={{ fontWeight:600 }}>{order.customer}</span><span style={{ color:S, marginLeft:8 }}>{order.phone}</span></div>
                      <div style={{ fontSize:11, color:S, marginTop:2 }}>🕐 {order.time} · {order.items.reduce((s,i)=>s+i.qty,0)} items · <strong style={{ color:'#111827' }}>{fmt(orderTotal)}</strong></div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                      <button onClick={() => setExpandedOrder(isExpanded?null:order.id)} style={{ ...btnL, padding:'5px 10px', fontSize:13 }}><i className={isExpanded?'ri-eye-off-line':'ri-eye-line'}/></button>
                      {order.status!=='processing'
                        ? <button onClick={() => loadOnlineOrderToCart(order)} style={{ ...btnP, padding:'6px 14px', fontSize:12, whiteSpace:'nowrap' }}><i className="ri-shopping-cart-2-line"/>Load to Cart</button>
                        : <span style={{ fontSize:11, color:'#299cdb', fontWeight:600 }}><i className="ri-check-double-line"/> Loaded</span>
                      }
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ marginTop:12, background:BG2, borderRadius:10, overflow:'hidden', border:`1px solid ${B}` }}>
                      {order.note && <div style={{ padding:'8px 14px', background:'#f7b84b18', borderBottom:`1px solid ${B}`, fontSize:12, color:'#8b6914' }}><i className="ri-sticky-note-line"/> <strong>Note:</strong> {order.note}</div>}
                      {order.items.map(({productId,qty}) => {
                        const p=PRODUCTS.find(x=>x.id===productId); if (!p) return null
                        const color=CAT_COLORS[p.cat]||'#0ab39c'
                        return (
                          <div key={productId} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderBottom:`1px solid ${B}` }}>
                            <div style={{ width:34, height:34, borderRadius:8, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{p.icon}</div>
                            <div style={{ flex:1, fontSize:13, fontWeight:500 }}>{p.name}</div>
                            <div style={{ fontSize:12, color:S }}>× {qty}</div>
                            <div style={{ fontSize:13, fontWeight:700, minWidth:80, textAlign:'right' }}>{fmt(p.price*qty)}</div>
                          </div>
                        )
                      })}
                      <div style={{ display:'flex', justifyContent:'flex-end', padding:'10px 14px', fontWeight:800, fontSize:14 }}>Total: <span style={{ color:'#0ab39c', marginLeft:8 }}>{fmt(orderTotal)}</span></div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ModalBox>
      )}

      {/* CASH */}
      {activeModal==='cash' && (
        <ModalBox maxWidth={440}>
          <MHead title="Cash Payment" onClose={closeModal} color="#0ab39c"/>
          <div style={{ padding:24, overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, fontSize:13 }}><span style={{ color:S }}>Total Payable</span><span style={{ fontWeight:700, fontSize:17 }}>{fmt(total)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20, fontSize:13 }}><span style={{ color:S }}>Payment Method</span><span style={{ background:'#dcfce7', color:'#166534', borderRadius:50, padding:'2px 10px', fontSize:11, fontWeight:600 }}>Cash</span></div>
            <label style={LBL}>Cash Received</label>
            <div style={{ display:'flex', border:`1.5px solid #e5e7eb`, borderRadius:8, overflow:'hidden', marginBottom:12 }}>
              <span style={{ background:BG2, padding:'0 12px', display:'flex', alignItems:'center', fontSize:15, color:S, borderRight:`1px solid ${B}` }}>₦</span>
              <input type="number" placeholder="0.00" value={cashReceived} onChange={e => setCashReceived(e.target.value)} autoFocus
                style={{ flex:1, border:'none', outline:'none', padding:'9px 12px', fontSize:14, fontFamily:'Nunito,sans-serif', color:'#111827' }}/>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
              {[500,1000,2000,5000].map(a=><button key={a} onClick={()=>setCashReceived(String(a))} style={{ ...btnL, flex:1 }}>{fmt(a)}</button>)}
              <button onClick={()=>setCashReceived(String(total))} style={{ ...btnL, flex:1 }}>Exact</button>
            </div>
            {cashReceived && Number(cashReceived)>=total && (
              <div style={{ background:'#dcfce7', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, fontSize:13 }}>
                <span style={{ fontWeight:600, color:'#166534' }}>Change to Return</span><span style={{ fontWeight:700, color:'#166534' }}>{fmt(cashChange)}</span>
              </div>
            )}
            {cashReceived && Number(cashReceived)<total && (
              <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, fontSize:13 }}>
                <span style={{ fontWeight:600, color:'#991b1b' }}>Amount Short</span><span style={{ fontWeight:700, color:'#991b1b' }}>{fmt(total-Number(cashReceived))}</span>
              </div>
            )}
            <div style={{ display:'flex', gap:12, marginTop:8 }}>
              <button style={{ ...btnL, flex:1 }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP, flex:1 }} disabled={!cashReceived||Number(cashReceived)<total} onClick={()=>confirmPayment('Cash')}>Submit</button>
            </div>
          </div>
        </ModalBox>
      )}

      {/* CARD / POS */}
      {activeModal==='card' && (
        <ModalBox maxWidth={460}>
          <MHead title="Card / POS Payment" onClose={closeModal} color="#405189"/>
          <div style={{ padding:24, overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, paddingBottom:16, borderBottom:`1px solid ${B}`, fontSize:13 }}>
              <span style={{ color:S }}>Total to charge on terminal</span><span style={{ fontWeight:700, fontSize:17 }}>{fmt(total)}</span>
            </div>
            <div style={{ background:'rgba(64,81,137,.08)', border:'1px solid rgba(64,81,137,.2)', borderRadius:10, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
              <i className="ri-bank-card-2-line" style={{ fontSize:28, color:'#405189', flexShrink:0 }}/>
              <div style={{ fontSize:12, color:S, lineHeight:1.6 }}>Process <strong style={{ color:'#111827' }}>{fmt(total)}</strong> on the external POS terminal.<br/>Once confirmed, click <strong style={{ color:'#405189' }}>Confirm Payment</strong> below.</div>
            </div>
            <label style={LBL}>Card Type <span style={{ fontWeight:400, color:S }}>(optional)</span></label>
            <div style={{ display:'flex', gap:8, marginBottom:24 }}>
              {['Visa','Mastercard','Verve','Other'].map(t=>(
                <button key={t} onClick={()=>setCardTab(t.toLowerCase())}
                  style={{ flex:1, padding:'8px 4px', borderRadius:8, border: cardTab===t.toLowerCase()?'2px solid #405189':`1px solid ${B}`, background: cardTab===t.toLowerCase()?'rgba(64,81,137,.1)':'transparent', fontSize:11, fontWeight:600, cursor:'pointer', color:cardTab===t.toLowerCase()?'#405189':S }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button style={{ ...btnL, flex:1 }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP, flex:1, background:'#405189' }} onClick={()=>confirmPayment('Card / POS')}><i className="ri-check-double-line"/>Confirm Payment</button>
            </div>
          </div>
        </ModalBox>
      )}

      {/* QR / USSD */}
      {activeModal==='qr' && (
        <ModalBox maxWidth={340}>
          <MHead title="QR / USSD Payment" onClose={closeModal} color="#299cdb"/>
          <div style={{ padding:24, textAlign:'center', overflowY:'auto' }}>
            <div style={{ fontSize:12, color:S, marginBottom:4 }}>Total Amount</div>
            <div style={{ fontSize:26, fontWeight:900, marginBottom:20 }}>{fmt(total)}</div>
            <div style={{ width:160, height:160, margin:'0 auto 16px', background:BG2, border:`2px solid ${B}`, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:6, color:S }}>
              <i className="ri-qr-code-line" style={{ fontSize:72 }}/>
              <div style={{ fontSize:9, fontWeight:600, letterSpacing:.5 }}>SCAN TO PAY</div>
            </div>
            <p style={{ color:S, marginBottom:8, fontSize:12 }}>Ask customer to scan the QR code<br/>or dial USSD to complete payment</p>
            <div style={{ background:'#405189', color:'#fff', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:700, marginBottom:20, display:'inline-block' }}>*737*000#{total}</div>
            <div style={{ display:'flex', gap:12 }}>
              <button style={{ ...btnL, flex:1 }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP, flex:1, background:'#299cdb' }} onClick={()=>confirmPayment('QR / USSD')}>Confirm Payment</button>
            </div>
          </div>
        </ModalBox>
      )}

      {/* BANK TRANSFER */}
      {activeModal==='transfer' && (
        <ModalBox maxWidth={440}>
          <MHead title="Bank Transfer" onClose={closeModal} color="#b45309"/>
          <div style={{ padding:24, overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}><span style={{ color:S }}>Total Payable</span><span style={{ fontWeight:700, fontSize:17 }}>{fmt(total)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20, fontSize:13 }}><span style={{ color:S }}>Payment Method</span><span style={{ background:'#e0f2fe', color:'#075985', borderRadius:50, padding:'2px 10px', fontSize:11, fontWeight:600 }}>Bank Transfer</span></div>
            <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'12px 16px', marginBottom:20, fontSize:13 }}>
              <div style={{ fontWeight:700, marginBottom:4 }}>Transfer to: Bems Farms Ltd</div>
              <div>GTBank · <strong>0123456789</strong></div>
              <div style={{ color:S, marginTop:4, fontSize:12 }}>Use <strong>{orderId}</strong> as reference</div>
            </div>
            <div style={{ marginBottom:12 }}><label style={LBL}>Customer's Bank Name</label><input style={inp} placeholder="e.g. GTBank, Access, Zenith" value={bankName} onChange={e=>setBankName(e.target.value)}/></div>
            <div style={{ marginBottom:12 }}><label style={LBL}>Transaction Reference / Session ID</label><input style={inp} placeholder="Enter reference number" value={txnRef} onChange={e=>setTxnRef(e.target.value)}/></div>
            <div style={{ marginBottom:20 }}><label style={LBL}>Transfer Date</label><input type="date" style={inp} value={transferDate} onChange={e=>setTransferDate(e.target.value)}/></div>
            <div style={{ background:'#e0f2fe', border:'1px solid #bae6fd', borderRadius:8, padding:'10px 14px', display:'flex', alignItems:'flex-start', gap:8, marginBottom:20, fontSize:12 }}>
              <i className="ri-bank-line" style={{ fontSize:18, color:'#0369a1', flexShrink:0 }}/>
              <span>Ensure the transfer is confirmed in your bank before submitting.</span>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button style={{ ...btnL, flex:1 }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP, flex:1 }} onClick={()=>confirmPayment('Bank Transfer')}>Submit</button>
            </div>
          </div>
        </ModalBox>
      )}

      {/* SPLIT PAYMENT */}
      {activeModal==='split' && (
        <ModalBox maxWidth={520}>
          <MHead title="Split Payment" onClose={closeModal} color="#7c3aed"/>
          <div style={{ padding:24, overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20, paddingBottom:16, borderBottom:`1px solid ${B}`, fontSize:13 }}>
              <span style={{ color:S }}>Total Payable</span><span style={{ fontWeight:700, fontSize:17 }}>{fmt(total)}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:12 }}>
              {splitRows.map((row,i) => (
                <div key={i} style={{ border:`1px solid ${B}`, borderRadius:10, padding:14 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:10, alignItems:'end' }}>
                    <div>
                      <label style={LBL}>Payment Method</label>
                      <select style={inp} value={row.method} onChange={e=>updateSplit(i,'method',e.target.value)}>
                        {['Cash','Card / POS','Bank Transfer','QR / USSD','Loyalty Points','Wallet'].map(m=><option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LBL}>Amount (₦)</label>
                      <input type="number" style={inp} placeholder="0.00" value={row.amount} onChange={e=>updateSplit(i,'amount',e.target.value)}/>
                    </div>
                    <div>
                      {splitRows.length > 2 && (
                        <button onClick={() => setSplitRows(r=>r.filter((_,ri)=>ri!==i))} style={{ ...btnL, color:'#991b1b', borderColor:'#fca5a5', padding:'8px 10px' }}>✕</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <button style={btnL} onClick={addSplitRow}><i className="ri-add-line"/>Add Another</button>
              <div style={{ fontSize:12, color:S }}>Allocated: <strong>{fmt(splitRows.reduce((s,r)=>s+(Number(r.amount)||0),0))}</strong> / {fmt(total)}</div>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button style={{ ...btnL, flex:1 }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP, flex:1, background:'#7c3aed' }} onClick={()=>confirmPayment('Split Payment')}>Submit</button>
            </div>
          </div>
        </ModalBox>
      )}

      {/* HOLD */}
      {activeModal==='hold' && (
        <ModalBox maxWidth={420}>
          <MHead title="Hold Bill" onClose={closeModal} color="#0ab39c"/>
          <div style={{ padding:24, overflowY:'auto' }}>
            <div style={{ background:BG2, borderRadius:8, padding:'12px 16px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13 }}>Total Bill Amount</span><span style={{ fontWeight:700, fontSize:16 }}>{fmt(total)}</span>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={LBL}>Hold Reference</label>
              <input style={inp} placeholder="e.g. Table 3 / Mrs Okonkwo order" value={holdRef} onChange={e=>setHoldRef(e.target.value)}/>
              <div style={{ fontSize:11, color:S, marginTop:4 }}>Helps identify this bill when you recall it later.</div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={LBL}>Notes</label>
              <textarea style={{ ...inp, resize:'vertical' }} rows={3} placeholder="Optional instructions…" value={holdNote} onChange={e=>setHoldNote(e.target.value)}/>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button style={{ ...btnL, flex:1 }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP, flex:1 }} disabled={cart.length===0} onClick={doHold}>Hold Bill</button>
            </div>
          </div>
        </ModalBox>
      )}

      {/* INVOICE PREVIEW */}
      {activeModal==='invoice' && (
        <ModalBox maxWidth={680}>
          <div style={{ background:'#fff', padding:'14px 20px', borderBottom:`1px solid ${B}`, display:'flex', alignItems:'center', flexWrap:'wrap', gap:12, flexShrink:0 }}>
            <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, flex:1 }}>Invoice Preview</span>
            <div style={{ display:'flex', gap:8 }}>
              {[['ri-file-pdf-2-line','PDF'],['ri-mail-line','Email'],['ri-printer-line','Print']].map(([icon,label])=>(
                <button key={label} style={btnL}><i className={icon}/>{label}</button>
              ))}
            </div>
            <button style={{ ...btnP, fontSize:12, padding:'6px 14px' }} onClick={closeModal}>Close</button>
          </div>
          <div style={{ padding:24, overflowY:'auto' }}>
            <div style={{ border:`1px solid ${B}`, padding:24, borderRadius:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
                <span style={{ fontSize:15, fontWeight:700 }}>{orderId}</span>
                <div style={{ fontSize:18, fontWeight:800, color:'#0ab39c' }}>🌾 Bems Farms</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                <div><p style={{ color:S, marginBottom:4, fontSize:12 }}>Issued On:</p><strong style={{ fontSize:14 }}>{new Date().toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'})}</strong></div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ color:S, marginBottom:4, fontSize:12 }}>Customer:</p>
                  <strong style={{ fontSize:14 }}>{customer?.name||'Walk-in Customer'}</strong>
                  {customer&&<p style={{ color:S, fontSize:12, marginTop:2 }}>{customer.phone}</p>}
                </div>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:16 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${B}` }}>
                    {['Item','Qty','Unit','Total'].map((h,i)=><th key={h} style={{ fontSize:11, fontWeight:600, color:S, padding:'8px 0', textAlign:i===0?'left':'right' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item=>(
                    <tr key={item.id}>
                      <td style={{ padding:'8px 0', fontSize:13 }}>{item.icon} {item.name}</td>
                      <td style={{ padding:'8px 0', fontSize:13, textAlign:'right' }}>{item.qty}</td>
                      <td style={{ padding:'8px 0', fontSize:13, textAlign:'right' }}>{fmt(item.price)}</td>
                      <td style={{ padding:'8px 0', fontSize:13, fontWeight:600, textAlign:'right' }}>{fmt(item.price*item.qty)}</td>
                    </tr>
                  ))}
                  {discountPct>0&&<tr><td colSpan={3} style={{ textAlign:'right', fontSize:12, color:'#f06548', padding:'6px 0' }}>Discount ({discountPct}%)</td><td style={{ textAlign:'right', fontSize:12, color:'#f06548', padding:'6px 0' }}>− {fmt(discountAmt)}</td></tr>}
                  <tr><td colSpan={3} style={{ textAlign:'right', fontSize:12, color:S, padding:'6px 0' }}>VAT (7.5%)</td><td style={{ textAlign:'right', fontSize:12, color:S, padding:'6px 0' }}>{fmt(vat)}</td></tr>
                  <tr style={{ borderTop:`2px solid ${B}` }}>
                    <td colSpan={3} style={{ fontWeight:700, padding:'10px 0', fontSize:14, textAlign:'right' }}>Total Payable</td>
                    <td style={{ fontWeight:800, padding:'10px 0', fontSize:15, textAlign:'right', color:'#22c55e' }}>{fmt(total)}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, fontSize:12 }}>
                <div><strong>Payment Information:</strong><p style={{ color:S, margin:'4px 0 0' }}>Bems Farms Ltd · GTBank · 0123456789</p><p style={{ color:S }}>Ref: {orderId}</p></div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ color:S, margin:'0 0 4px' }}>Fresh from farm to your table 🌱</p>
                  <p style={{ color:S, fontSize:11 }}>Thank you for choosing Bems Farms!</p>
                </div>
              </div>
            </div>
          </div>
        </ModalBox>
      )}

      {/* PAY LATER */}
      {activeModal==='paylater' && (
        <ModalBox maxWidth={420}>
          <MHead title="Pay Later" onClose={closeModal} color="#b45309"/>
          <div style={{ padding:24, overflowY:'auto' }}>
            <div style={{ background:BG2, borderRadius:8, padding:'12px 16px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13 }}>Total Bill Amount</span><span style={{ fontWeight:700, fontSize:16 }}>{fmt(total)}</span>
            </div>
            <div style={{ marginBottom:16 }}><label style={LBL}>Customer</label><input style={inp} placeholder="Search customer name or phone" value={payLaterCust} onChange={e=>setPayLaterCust(e.target.value)}/></div>
            <div style={{ marginBottom:24 }}><label style={LBL}>Due Date</label><input type="date" style={inp} value={payLaterDate} onChange={e=>setPayLaterDate(e.target.value)}/></div>
            <div style={{ display:'flex', gap:12 }}>
              <button style={{ ...btnL, flex:1 }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP, flex:1 }} onClick={()=>{ showToast('Pay-later order saved!','success','⏰'); closeModal() }}>Confirm</button>
            </div>
          </div>
        </ModalBox>
      )}

      {/* BILLING HISTORY */}
      {activeModal==='history' && (
        <ModalBox maxWidth={720}>
          <MHead title="Billing History" onClose={closeModal} color="#299cdb"/>
          <div style={{ padding:24, overflowY:'auto' }}>
            <div style={{ position:'relative', marginBottom:16 }}>
              <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:15 }}/>
              <input style={{ ...inp, paddingLeft:34 }} placeholder="Search invoices…"/>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:BG2, borderBottom:`1px solid ${B}` }}>
                    {['Invoice','Customer','Payment','Time','Amount','Actions'].map(h=>(
                      <th key={h} style={{ padding:'10px 12px', fontSize:11, fontWeight:700, color:S, textTransform:'uppercase', letterSpacing:'.06em', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HISTORY_MOCK.map(h=>(
                    <tr key={h.inv}>
                      <td style={{ padding:'12px 12px', fontSize:13, color:'#0ab39c', fontWeight:600, borderBottom:`1px solid #f3f4f6` }}>{h.inv}</td>
                      <td style={{ padding:'12px 12px', fontSize:13, borderBottom:`1px solid #f3f4f6` }}>{h.cust}</td>
                      <td style={{ padding:'12px 12px', fontSize:13, borderBottom:`1px solid #f3f4f6` }}>{h.method}</td>
                      <td style={{ padding:'12px 12px', fontSize:12, color:S, borderBottom:`1px solid #f3f4f6`, whiteSpace:'nowrap' }}>
                        {new Date().toLocaleDateString('en-NG',{day:'numeric',month:'short'})} <span style={{ marginLeft:6 }}>{h.time}</span>
                      </td>
                      <td style={{ padding:'12px 12px', fontSize:13, fontWeight:600, borderBottom:`1px solid #f3f4f6` }}>{fmt(h.amount)}</td>
                      <td style={{ padding:'12px 12px', borderBottom:`1px solid #f3f4f6` }}>
                        <div style={{ display:'flex', gap:4 }}>
                          <button style={{ background:BG2, border:`1px solid ${B}`, borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:13, color:'#374151' }}><i className="ri-eye-line"/></button>
                          <button style={{ background:BG2, border:`1px solid ${B}`, borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:13, color:'#374151' }}><i className="ri-printer-line"/></button>
                          <button style={{ background:'#fee2e2', border:'none', borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:13, color:'#991b1b' }}><i className="ri-delete-bin-5-line"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ModalBox>
      )}

      {/* PAYMENT SUCCESS */}
      {activeModal==='success' && successData && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:900, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:380, boxShadow:'0 24px 48px rgba(0,0,0,.3)' }}>
            <div style={{ padding:'32px 24px', textAlign:'center' }}>
              <div style={{ width:80, height:80, borderRadius:'50%', background:'#0ab39c', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:36 }}>✅</div>
              <h5 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:20, marginBottom:8 }}>Payment Successful!</h5>
              <p style={{ color:S, marginBottom:20 }}>Transaction processed successfully.</p>
              <div style={{ marginBottom:20 }}>
                <small style={{ color:S }}>Amount</small>
                <h4 style={{ fontWeight:800, fontSize:24, margin:'4px 0', color:'#0ab39c' }}>{fmt(successData.total)}</h4>
                <small style={{ color:S }}>
                  {successData.paidAt.toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})} · Bill ID: <span style={{ fontWeight:600, color:'#111827' }}>{successData.orderId}</span>
                </small>
              </div>
              <div style={{ background:BG2, borderRadius:8, padding:'12px 16px', marginBottom:20, fontSize:12, textAlign:'left' }}>
                {[
                  ['Customer', successData.customer?.name||'Walk-in'],
                  ['Method', successData.method],
                  ['Items', `${successData.cart.reduce((s,i)=>s+i.qty,0)} item(s)`],
                  successData.verifiedTxn ? ['Txn ID', successData.verifiedTxn.transaction_id] : null,
                ].filter(Boolean).map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span style={{ color:S }}>{k}</span><span style={{ fontWeight:600 }}>{v}</span></div>
                ))}
                {successData.verifiedTxn && (
                  <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:5, color:'#166534', fontSize:11 }}>
                    <i className="ri-checkbox-circle-fill" style={{ color:'#0ab39c' }}/>Payment record verified & linked
                  </div>
                )}
              </div>
              <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:16 }}>
                <button style={btnL}><i className="ri-file-pdf-2-line"/>Download</button>
                <button style={btnL}><i className="ri-printer-line"/>Print Receipt</button>
              </div>
              <button style={{ ...btnP, width:'100%', justifyContent:'center', padding:'12px' }} onClick={newOrder}><i className="ri-add-circle-line"/>New Order</button>
            </div>
          </div>
        </div>
      )}

      {/* GOODS RETURN */}
      {activeModal==='return' && (() => {
        const retTotal = Number(returnForm.qty) * Number(returnForm.unitPrice)
        function submitReturn() {
          const ref = 'RTN-POS-' + String(Date.now()).slice(-5)
          setReturnLogs(prev => [...prev, { ...returnForm, ref, total:retTotal, date:new Date().toLocaleString('en-NG') }])
          setReturnSuccess({ ref, total:retTotal, method:returnForm.refundMethod, condition:returnForm.condition })
        }
        if (returnSuccess) return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:820, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div style={{ background:'#fff', borderRadius:16, maxWidth:360, width:'100%', padding:32, textAlign:'center', boxShadow:'0 24px 48px rgba(0,0,0,.3)' }}>
              <div style={{ width:72, height:72, borderRadius:'50%', background:'#0ab39c', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:32 }}>✅</div>
              <h6 style={{ fontWeight:700, marginBottom:4, fontSize:16 }}>Return Processed</h6>
              <div style={{ color:S, marginBottom:16, fontSize:13 }}>{returnSuccess.ref}</div>
              <div style={{ background:BG2, borderRadius:8, padding:16, marginBottom:20, fontSize:13, textAlign:'left' }}>
                {[['Refund Amount',`₦${returnSuccess.total.toLocaleString()}`,true],['Method',returnSuccess.method],['Goods',{resalable:'Back to stock',damaged:'Written off',partial:'Split'}[returnSuccess.condition]]].map(([k,v,red])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ color:S }}>{k}</span><span style={{ fontWeight:700, color:red?'#f06548':'#111827' }}>{v}</span></div>
                ))}
              </div>
              <button style={{ ...btnP, width:'100%', justifyContent:'center' }} onClick={closeModal}>Done</button>
            </div>
          </div>
        )
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:820, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div style={{ background:'#fff', borderRadius:16, maxWidth:600, width:'100%', boxShadow:'0 24px 48px rgba(0,0,0,.3)', overflow:'hidden', maxHeight:'92vh', display:'flex', flexDirection:'column' }}>
              <div style={{ padding:'14px 20px', borderBottom:`1px solid ${B}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:BG2, flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#f06548,#e04b2f)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className="ri-arrow-go-back-line" style={{ fontSize:18, color:'#fff' }}/>
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>Goods Return</div>
                    <div style={{ fontSize:11, color:S }}>Step {returnStep} of 2</div>
                  </div>
                </div>
                <button onClick={closeModal} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:S }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ display:'flex', borderBottom:`1px solid ${B}`, flexShrink:0 }}>
                {[{n:1,label:'Return Details'},{n:2,label:'Inspect & Refund'}].map(s=>(
                  <div key={s.n} style={{ flex:1, padding:'10px 16px', textAlign:'center', fontSize:12, fontWeight:returnStep===s.n?700:400, color:returnStep===s.n?'#f06548':S, borderBottom:returnStep===s.n?'3px solid #f06548':'3px solid transparent', cursor:'pointer' }}
                    onClick={() => returnStep>s.n&&setReturnStep(s.n)}>
                    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:20, height:20, borderRadius:'50%', background:returnStep>=s.n?'#f06548':B, color:returnStep>=s.n?'#fff':S, fontSize:10, fontWeight:700, marginRight:6 }}>{s.n}</span>
                    {s.label}
                  </div>
                ))}
              </div>

              <div style={{ padding:20, overflowY:'auto', flex:1 }}>
                {returnStep===1 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <div>
                      <label style={{ ...LBL, color:'#f06548' }}><i className="ri-barcode-line"/> Scan Barcode / Enter SKU</label>
                      <div style={{ position:'relative' }}>
                        <i className="ri-barcode-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#f06548', fontSize:15 }}/>
                        <input autoFocus style={{ ...inp, paddingLeft:34, borderColor:'#f06548', boxShadow:'0 0 0 3px rgba(240,101,72,.1)' }}
                          placeholder="Scan barcode or type SKU + Enter  (e.g. BF-VEG-001)"
                          onKeyDown={e => {
                            if (e.key==='Enter') {
                              const code=e.target.value.trim().toUpperCase()
                              const found=BY_BARCODE[code]||BY_BARCODE['BF-'+code]||BY_SKU[code]
                              if (found) { setReturnForm(f=>({...f,product:found,unitPrice:found.price})); showToast(`${found.name} selected`,'success',found.icon); e.target.value='' }
                              else showToast('Product not found: '+code,'error','❌')
                            }
                          }}/>
                      </div>
                      <div style={{ fontSize:11, color:S, marginTop:4 }}>Or select manually from the dropdown below</div>
                    </div>
                    {returnForm.product && (
                      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:8, background:'rgba(240,101,72,.08)', border:'1px solid rgba(240,101,72,.25)' }}>
                        <span style={{ fontSize:28 }}>{returnForm.product.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:13 }}>{returnForm.product.name}</div>
                          <div style={{ fontSize:11, color:S }}>{returnForm.product.sku} · ₦{returnForm.product.price.toLocaleString()} / {returnForm.product.unit}</div>
                        </div>
                        <span style={{ background:'#fee2e2', color:'#991b1b', borderRadius:50, padding:'2px 8px', fontSize:10, fontWeight:600 }}>Selected</span>
                      </div>
                    )}
                    <div>
                      <label style={LBL}>Product Being Returned *</label>
                      <select style={inp} value={returnForm.product.id} onChange={e=>{ const p=PRODUCTS.find(p=>p.id===Number(e.target.value)); setReturnForm(f=>({...f,product:p,unitPrice:p.price})) }}>
                        {PRODUCTS.map(p=><option key={p.id} value={p.id}>{p.icon} {p.name} — ₦{p.price.toLocaleString()} / {p.unit}</option>)}
                      </select>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <div><label style={LBL}>Return Cart Name</label><input style={inp} placeholder="Walk-in / Return Cart name" value={returnForm.customer} onChange={e=>setReturnForm(f=>({...f,customer:e.target.value}))}/></div>
                      <div><label style={LBL}>Phone (optional)</label><input style={inp} placeholder="0800 000 0000" value={returnForm.phone} onChange={e=>setReturnForm(f=>({...f,phone:e.target.value}))}/></div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                      <div><label style={LBL}>Quantity</label><input type="number" style={inp} min="1" value={returnForm.qty} onChange={e=>setReturnForm(f=>({...f,qty:Number(e.target.value)}))}/></div>
                      <div><label style={LBL}>Unit Price (₦)</label><input type="number" style={inp} min="0" value={returnForm.unitPrice} onChange={e=>setReturnForm(f=>({...f,unitPrice:Number(e.target.value)}))}/></div>
                      <div><label style={LBL}>Return Value</label><input style={{ ...inp, background:BG2, fontWeight:700, color:'#f06548' }} readOnly value={`₦${retTotal.toLocaleString()}`}/></div>
                    </div>
                    <div><label style={LBL}>Return Reason *</label><select style={inp} value={returnForm.reason} onChange={e=>setReturnForm(f=>({...f,reason:e.target.value}))}>{POS_RETURN_REASONS.map(r=><option key={r}>{r}</option>)}</select></div>
                    <div><label style={LBL}>Return Cart Notes</label><textarea style={{ ...inp, resize:'vertical' }} rows={2} placeholder="What did the customer say?" value={returnForm.notes} onChange={e=>setReturnForm(f=>({...f,notes:e.target.value}))}/></div>
                    <div style={{ display:'flex', gap:10 }}>
                      <button style={{ ...btnL, flex:1 }} onClick={closeModal}>Cancel</button>
                      <button style={{ ...btnD, flex:1 }} onClick={()=>setReturnStep(2)} disabled={!returnForm.product||returnForm.qty<1}>Next: Inspect Goods <i className="ri-arrow-right-line"/></button>
                    </div>
                  </div>
                )}

                {returnStep===2 && (
                  <>
                    <div style={{ background:BG2, border:`1px solid ${B}`, borderRadius:8, padding:14, marginBottom:20, fontSize:13 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ color:S }}>Product</span><span style={{ fontWeight:600 }}>{returnForm.product.icon} {returnForm.product.name}</span></div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ color:S }}>Qty · Reason</span><span>{returnForm.qty} {returnForm.product.unit} · {returnForm.reason}</span></div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:S }}>Refund Value</span><span style={{ fontWeight:700, color:'#f06548' }}>₦{retTotal.toLocaleString()}</span></div>
                    </div>
                    <div style={{ marginBottom:20 }}>
                      <label style={LBL}>Goods Condition *</label>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                        {[
                          { val:'resalable', icon:'ri-checkbox-circle-line',       color:'#0ab39c', title:'Resalable',        desc:'Good condition — return to stock'   },
                          { val:'damaged',   icon:'ri-close-circle-line',          color:'#f06548', title:'Damaged / Spoiled', desc:'Write off — cannot resell'          },
                          { val:'partial',   icon:'ri-indeterminate-circle-line',  color:'#f7b84b', title:'Partially Good',   desc:'Some stock, rest written off'       },
                        ].map(opt=>(
                          <div key={opt.val} onClick={()=>setReturnForm(f=>({...f,condition:opt.val}))}
                            style={{ padding:'12px 8px', borderRadius:10, border:`2px solid ${returnForm.condition===opt.val?opt.color:B}`, background:returnForm.condition===opt.val?`${opt.color}12`:'transparent', cursor:'pointer', textAlign:'center' }}>
                            <i className={opt.icon} style={{ fontSize:22, color:opt.color, display:'block', marginBottom:4 }}/>
                            <div style={{ fontSize:11, fontWeight:700, color:opt.color }}>{opt.title}</div>
                            <div style={{ fontSize:10, color:S, marginTop:4 }}>{opt.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom:20 }}>
                      <label style={LBL}>Refund Method</label>
                      <div style={{ display:'flex', gap:8 }}>
                        {['Cash','Wallet Credit'].map(m=>(
                          <button key={m} onClick={()=>setReturnForm(f=>({...f,refundMethod:m}))}
                            style={{ flex:1, padding:'8px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:600, fontSize:12, background:returnForm.refundMethod===m?'#f06548':'#f3f4f6', color:returnForm.refundMethod===m?'#fff':'#374151' }}>
                            {m==='Cash'?'💵':'👛'} {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <button style={{ ...btnL, minWidth:100 }} onClick={()=>setReturnStep(1)}><i className="ri-arrow-left-line"/>Back</button>
                      <button style={{ ...btnD, flex:1 }} onClick={submitReturn}><i className="ri-check-double-line"/>Confirm Return · Refund ₦{retTotal.toLocaleString()} via {returnForm.refundMethod}</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* HELD ORDERS PANEL */}
      {activeModal==='heldOrders' && (
        <ModalBox maxWidth={660} style={{ maxHeight:'88vh' }}>
          <MHead title={`Held Orders  (${heldOrders.length})`} onClose={() => { setDeleteHoldIdx(null); closeModal() }} color="linear-gradient(135deg,#f7b84b,#d97706)" icon="⏸️"/>

          {/* Summary bar */}
          <div style={{ padding:'10px 20px', background:'#fffbeb', borderBottom:`1px solid #fde68a`, display:'flex', gap:20, flexShrink:0 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#92400e' }}>{heldOrders.length}</div>
              <div style={{ fontSize:10, color:'#a16207' }}>Orders</div>
            </div>
            <div style={{ width:1, background:'#fde68a' }}/>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#92400e' }}>{fmt(heldOrders.reduce((s,h)=>s+h.cart.reduce((hs,ci)=>hs+ci.price*ci.qty,0),0))}</div>
              <div style={{ fontSize:10, color:'#a16207' }}>Total Value</div>
            </div>
            <div style={{ width:1, background:'#fde68a' }}/>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#92400e' }}>{heldOrders.reduce((s,h)=>s+h.cart.reduce((hs,ci)=>hs+ci.qty,0),0)}</div>
              <div style={{ fontSize:10, color:'#a16207' }}>Total Items</div>
            </div>
          </div>

          <div style={{ flex:1, overflowY:'auto' }}>
            {heldOrders.length===0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px', color:S }}>
                <div style={{ fontSize:52 }}>⏸️</div>
                <p style={{ marginTop:12, fontSize:14 }}>No held orders</p>
                <p style={{ fontSize:12, color:S }}>Use "Hold Bill" to park a cart and retrieve it later</p>
              </div>
            ) : heldOrders.map((h,i) => {
              const hTotal = h.cart.reduce((s,ci)=>s+ci.price*ci.qty,0)
              const hItems = h.cart.reduce((s,ci)=>s+ci.qty,0)
              const isConfirmDelete = deleteHoldIdx===i
              return (
                <div key={i} style={{ borderBottom:`1px solid ${B}`, padding:'14px 20px', background: isConfirmDelete?'#fef2f2':'transparent' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                    {/* Number badge */}
                    <div style={{ width:44, height:44, borderRadius:12, background:'#f7b84b20', border:'2px solid #f7b84b60', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0, color:'#92400e', fontWeight:800 }}>
                      #{i+1}
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, overflow:'hidden' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                        <span style={{ fontWeight:700, fontSize:14, color:'#111827' }}>{h.ref||h.orderId}</span>
                        {h.customer && (
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#0ab39c18', color:'#0ab39c', fontWeight:600 }}>
                            👤 {h.customer.name}
                          </span>
                        )}
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#f7b84b20', color:'#92400e', fontWeight:600 }}>⏸️ On Hold</span>
                      </div>
                      <div style={{ fontSize:12, color:S, marginBottom:6 }}>
                        <strong style={{ color:'#0ab39c', fontSize:14 }}>{fmt(hTotal)}</strong>
                        <span style={{ marginLeft:8 }}>· {hItems} item{hItems!==1?'s':''}</span>
                        {h.note && <span style={{ marginLeft:8, color:'#92400e' }}>📝 {h.note}</span>}
                      </div>
                      {/* Items preview chips */}
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {h.cart.slice(0,5).map(item => (
                          <span key={item.id} style={{ fontSize:10, padding:'2px 7px', background:BG2, borderRadius:4, border:`1px solid ${B}`, color:'#374151' }}>
                            {item.icon} {item.name.split(' ').slice(0,2).join(' ')} ×{item.qty}
                          </span>
                        ))}
                        {h.cart.length > 5 && <span style={{ fontSize:10, color:S, alignSelf:'center' }}>+{h.cart.length-5} more</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                      <button onClick={() => { recallOrder(i); setDeleteHoldIdx(null); closeModal() }}
                        style={{ ...btnP, fontSize:12, padding:'6px 16px', gap:5 }}>
                        <i className="ri-play-circle-line"/>Resume
                      </button>
                      {isConfirmDelete ? (
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={() => deleteHeldOrder(i)} style={{ ...btnD, fontSize:11, padding:'5px 10px', flex:1, gap:4 }}>
                            <i className="ri-delete-bin-line"/>Confirm
                          </button>
                          <button onClick={() => setDeleteHoldIdx(null)} style={{ ...btnL, fontSize:11, padding:'5px 8px' }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteHoldIdx(i)}
                          style={{ ...btnL, fontSize:11, padding:'5px 12px', color:'#f06548', borderColor:'#fca5a5', gap:4 }}>
                          <i className="ri-delete-bin-line"/>Delete
                        </button>
                      )}
                    </div>
                  </div>
                  {isConfirmDelete && (
                    <div style={{ marginTop:10, padding:'8px 10px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:6, fontSize:11, color:'#991b1b', display:'flex', alignItems:'center', gap:6 }}>
                      <i className="ri-error-warning-line"/>This held order will be permanently removed. Click Confirm to delete.
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ padding:'12px 20px', borderTop:`2px solid ${B}`, background:BG2, flexShrink:0, display:'flex', justifyContent:'flex-end' }}>
            <button style={btnL} onClick={() => { setDeleteHoldIdx(null); closeModal() }}>Close</button>
          </div>
        </ModalBox>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position:'fixed', bottom:30, right:30, zIndex:999, padding:'10px 18px', borderRadius:10, background:toast.type==='error'?'#f06548':'#0ab39c', color:'#fff', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8, boxShadow:'0 8px 24px rgba(0,0,0,.25)', animation:'fadeIn .2s ease', maxWidth:280 }}>
          <span style={{ fontSize:20 }}>{toast.icon}</span><span>{toast.msg}</span>
        </div>
      )}

      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        body.sidebar-hidden .page-wrapper { display: none !important; }
        body.sidebar-hidden #main-sidebar { display: none !important; }
        body.sidebar-hidden #main-topbar  { display: none !important; }
      `}</style>
    </div>
  )
}
