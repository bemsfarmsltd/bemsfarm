import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

const CHANNEL_META = {
  website:   { label:'Website',   icon:'ri-global-line',    color:'#405189' },
  whatsapp:  { label:'WhatsApp',  icon:'ri-whatsapp-line',  color:'#25d366' },
  instagram: { label:'Instagram', icon:'ri-instagram-line', color:'#e1306c' },
  phone:     { label:'Phone',     icon:'ri-phone-line',     color:'#f7b84b' },
}
// Real orders carry whatever free-text `source` the order was placed with
// (e.g. "Web App", "ai_chef") rather than the fixed channel keys above —
// map known ones to a nice badge and fall back gracefully for the rest.
function channelMeta(channel) {
  const key = (channel || '').toLowerCase()
  if (key.includes('whatsapp'))  return CHANNEL_META.whatsapp
  if (key.includes('instagram')) return CHANNEL_META.instagram
  if (key.includes('phone'))     return CHANNEL_META.phone
  if (key.includes('ai') || key.includes('chef')) return { label:'Chef Bems AI', icon:'ri-robot-2-line', color:'#a78bfa' }
  return { label: channel || 'Web App', icon:'ri-global-line', color:'#405189' }
}
// Real order.status values (see server/src/routes/orders_admin.js) don't
// map 1:1 to the New/Pending/Processing tabs below — bucket them.
function onlineStatusBucket(status) {
  if (['processing','packed_ready','being_packed','driver_assigned'].includes(status)) return 'processing'
  if (['confirmed','paid'].includes(status)) return 'pending'
  return 'new'
}
const STATUS_META = {
  new:        { label:'New',        color:'#0ab39c', bg:'rgba(10,179,156,.12)'  },
  pending:    { label:'Pending',    color:'#f7b84b', bg:'rgba(247,184,75,.12)'  },
  processing: { label:'Processing', color:'#299cdb', bg:'rgba(41,156,219,.12)'  },
}
const fmt = n => '₦' + Math.round(n).toLocaleString()
const genOrderId = () => 'BF-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5)
const POS_RETURN_REASONS = ['Damaged on delivery','Wrong item sent','Quality below standard','Spoiled / Already expired','Item missing from order','Incorrect quantity','Customer changed mind','Packaging damaged']

const inp = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid var(--border)',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'var(--bg-card)',boxSizing:'border-box',color:'var(--text-primary)' }
const LBL = { display:'block',fontSize:12,fontWeight:700,color:'var(--text-secondary)',marginBottom:4 }
const btnP = { display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#0ab39c',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,padding:'8px 16px',borderRadius:9,border:'1.5px solid var(--border)',background:'var(--bg-card)',color:'var(--text-secondary)',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const btnD = { display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#f06548',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }

function Overlay({ onClick }) {
  return <div onClick={onClick} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
}
function ModalBox({ children, maxWidth=460, style={} }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <div style={{ background:'var(--bg-card)',borderRadius:14,width:'100%',maxWidth,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden',maxHeight:'92vh',display:'flex',flexDirection:'column',...style }}>
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

  const [onlineOrders, setOnlineOrders]   = useState([])
  const [onlineFilter, setOnlineFilter]   = useState('all')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [orderDetails, setOrderDetails]   = useState({}) // id -> { items, loading }
  const [loadingOrderId, setLoadingOrderId] = useState(null)

  const [customer, setCustomer]           = useState(null)
  const [custSearch, setCustSearch]       = useState('')
  const [custResults, setCustResults]     = useState([])
  const [custSearching, setCustSearching] = useState(false)
  const [showCustPanel, setShowCustPanel] = useState(false)

  const [receipts, setReceipts]           = useState([])
  const [receiptsLoading, setReceiptsLoading] = useState(false)
  const [receiptSearch, setReceiptSearch] = useState('')

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

  const [returnForm, setReturnForm] = useState({ customer:'Walk-in', phone:'', product:null, qty:1, unitPrice:0, reason:POS_RETURN_REASONS[0], notes:'', condition:'resalable', refundMethod:'Cash' })
  const [returnStep, setReturnStep]       = useState(1)
  const [returnLogs, setReturnLogs]       = useState([])
  const [returnSuccess, setReturnSuccess] = useState(null)

  const [txnLastFour, setTxnLastFour]         = useState('')
  const [txnVerifyStatus, setTxnVerifyStatus] = useState('idle') // idle|loading|found|multiple|notfound|error
  const [txnVerifiedData, setTxnVerifiedData] = useState(null)
  const [txnMatches, setTxnMatches]           = useState([])
  const [deleteHoldIdx, setDeleteHoldIdx]     = useState(null)

  // Real catalog — the sale-facing grid/cart/checkout use this, never the
  // hardcoded PRODUCTS demo array, so what's rung up matches real inventory.
  const [catalog, setCatalog]           = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [confirmingPayment, setConfirmingPayment] = useState(false)

  useEffect(() => {
    api.get('/admin/pos/products', { params: { limit: 200 } })
      .then(({ data }) => setCatalog(data.products || []))
      .catch(() => showToast('Failed to load products from server', 'error', '⚠️'))
      .finally(() => setCatalogLoading(false))
  }, [])

  // Barcode/SKU lookup for Goods Return — built from the real catalog so
  // refunds price off actual inventory, not the hardcoded PRODUCTS demo data.
  const catalogByBarcode = useMemo(() => {
    const map = {}
    catalog.forEach(p => { if (p.barcode) map[p.barcode.toUpperCase()] = p })
    return map
  }, [catalog])
  const catalogBySku = useMemo(() => {
    const map = {}
    catalog.forEach(p => { if (p.sku) map[p.sku.toUpperCase()] = p })
    return map
  }, [catalog])

  // Real "online orders" — actionable, non-POS orders still awaiting fulfilment.
  function refreshOnlineOrders() {
    api.get('/admin/orders', { params: { limit: 50 } })
      .then(({ data }) => {
        const actionable = (data.orders || []).filter(o =>
          !['pos', 'physical store (pos)'].includes((o.channel || '').toLowerCase()) &&
          !['delivered', 'completed', 'out_for_delivery', 'delivery_attempted', 'dispute', 'cancelled'].includes(o.status)
        )
        setOnlineOrders(actionable)
      })
      .catch(() => {})
  }
  useEffect(() => { refreshOnlineOrders() }, [])

  // Fetch full item detail for one online order on demand (list endpoint only
  // returns item_count, not the items themselves) and cache it.
  function loadOrderDetail(id) {
    if (orderDetails[id] && !orderDetails[id].error) return Promise.resolve(orderDetails[id])
    setOrderDetails(prev => ({ ...prev, [id]: { loading: true } }))
    return api.get(`/admin/orders/${id}`)
      .then(({ data }) => {
        const detail = { loading: false, items: data.items || [], customer_id: data.customer_id }
        setOrderDetails(prev => ({ ...prev, [id]: detail }))
        return detail
      })
      .catch(() => {
        const detail = { loading: false, items: [], error: true }
        setOrderDetails(prev => ({ ...prev, [id]: detail }))
        return detail
      })
  }

  // Real tax config from Settings → Tax — the backend applies the same
  // rules at sale time, so this preview matches what actually gets charged.
  const [taxSettings, setTaxSettings] = useState({ enabled: false, rate: 0, inclusive: false })
  useEffect(() => {
    api.get('/admin/settings/tax').then(({ data }) => {
      const s = data.settings || {}
      setTaxSettings({
        enabled: s.tax_enabled === 'true',
        rate: parseFloat(s.tax_rate ?? '7.5') || 0,
        inclusive: s.tax_inclusive === 'true',
      })
    }).catch(() => {})
  }, [])

  // Live customer lookup for the "attach customer" panel — debounced.
  useEffect(() => {
    if (!showCustPanel) return
    setCustSearching(true)
    const t = setTimeout(() => {
      api.get('/admin/pos/customers', { params: { q: custSearch, limit: 20 } })
        .then(({ data }) => setCustResults(data.customers || []))
        .catch(() => setCustResults([]))
        .finally(() => setCustSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [custSearch, showCustPanel])

  // Real completed POS sales for the Billing History tab — fetched on open.
  useEffect(() => {
    if (activeModal !== 'history') return
    setReceiptsLoading(true)
    const t = setTimeout(() => {
      api.get('/admin/pos/receipts', { params: { search: receiptSearch, limit: 50 } })
        .then(({ data }) => setReceipts(data.receipts || []))
        .catch(() => setReceipts([]))
        .finally(() => setReceiptsLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [activeModal, receiptSearch])

  const categories = useMemo(() => {
    const seen = new Map()
    catalog.forEach(p => { if (p.category_id != null && !seen.has(p.category_id)) seen.set(p.category_id, p.category || 'Other') })
    return [{ id:'all', label:'All Items', emoji:'🛒' }, ...[...seen].map(([id, label]) => ({ id, label, emoji:'🌿' }))]
  }, [catalog])
  const CAT_PALETTE = ['#0ab39c','#405189','#f06548','#f7b84b','#4ade80','#a78bfa','#38bdf8','#22c55e']
  const catColor = (categoryId) => categoryId == null ? '#405189' : CAT_PALETTE[Math.abs(categoryId) % CAT_PALETTE.length]

  const scanInputRef = useRef(null)
  const scanBuffer   = useRef('')
  const lastKeyTime  = useRef(0)
  const onScanRef    = useRef(null)

  const handleBarcodeScan = useCallback((code) => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    const product = catalog.find(p => p.barcode?.toUpperCase() === trimmed || p.barcode?.toUpperCase() === 'BF-' + trimmed || p.sku?.toUpperCase() === trimmed)
    if (!product) { showToast('Not found: ' + trimmed, 'error', '❌'); return }
    addProductToCart(product)
    setSearch('')
    if (scanInputRef.current) scanInputRef.current.focus()
  }, [catalog])
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
    const product = catalog.find(p => p.barcode?.toUpperCase() === trimmed || p.barcode?.toUpperCase() === 'BF-' + trimmed || p.sku?.toUpperCase() === trimmed)
    if (!product) { showToast('Not found: ' + trimmed, 'error', '❌'); return }
    setScanCart(prev => { const ex = prev.find(i => i.id === product.id); if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i); return [...prev, { ...product, qty: 1 }] })
    showToast(`${product.name} scanned`, 'success', '📦')
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

  async function loadOnlineOrderToCart(order) {
    setLoadingOrderId(order.id)
    const detail = await loadOrderDetail(order.id)
    setLoadingOrderId(null)
    if (detail.error) { showToast('Could not load order details', 'error', '⚠️'); return }
    let loaded = 0
    detail.items.forEach(item => {
      const product = catalog.find(p => p.id === item.product_id)
      if (!product) return
      const qty = item.quantity
      setCart(prev => { const ex = prev.find(i => i.id === product.id); if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + qty } : i); return [...prev, { ...product, qty, note: '' }] })
      loaded++
    })
    if (detail.customer_id) setCustomer({ id: detail.customer_id, name: order.customer_name, phone: order.customer_phone, points: 0 })
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
  const vat         = !taxSettings.enabled ? 0
    : taxSettings.inclusive ? Math.round(taxable - taxable / (1 + taxSettings.rate / 100))
    : Math.round(taxable * (taxSettings.rate / 100))
  const total       = taxSettings.inclusive ? taxable : taxable + vat
  const itemCount   = cart.reduce((s, i) => s + i.qty, 0)
  const cashChange  = cashReceived ? Math.max(0, Number(cashReceived) - total) : 0
  const splitAllocated = splitRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const splitMismatch  = Math.abs(splitAllocated - total) > 0.01

  async function confirmPayment(method) {
    if (cart.length === 0 || confirmingPayment) return
    if (method === 'Split Payment' && splitMismatch) return
    setConfirmingPayment(true)
    try {
      const { data } = await api.post('/admin/pos/sale', {
        items: cart.map(i => ({ product_id: i.id, quantity: i.qty })),
        customer_id: customer?.id || null,
        customer_name: customer?.name || 'Walk-in Customer',
        payment_method: method,
        amount_tendered: method === 'Cash' && cashReceived ? Number(cashReceived) : undefined,
        discount_amount: discountAmt,
        notes: orderNote || undefined,
        split_payments: method === 'Split Payment'
          ? splitRows.filter(r => Number(r.amount) > 0).map(r => ({ method: r.method, amount: Number(r.amount) }))
          : undefined,
      })
      const { order: savedOrder, items: soldItems } = data
      // Reflect the real post-sale stock locally without a full refetch
      setCatalog(prev => prev.map(p => {
        const sold = soldItems.find(i => i.product_id === p.id)
        return sold ? { ...p, stock: Math.max(0, p.stock - sold.quantity) } : p
      }))
      setSuccessData({
        orderId: savedOrder.id, customer, cart: [...cart],
        subtotal: Number(savedOrder.subtotal), discountAmt: Number(savedOrder.discount_amount),
        vat: Number(savedOrder.tax_amount), total: Number(savedOrder.total),
        discountPct, method, paidAt: new Date(savedOrder.created_at || Date.now()),
        verifiedTxn: txnVerifiedData,
      })
      if (txnVerifiedData?.id) {
        api.patch(`/admin/pos/verify-payment/${txnVerifiedData.id}/use`).catch(() => {})
      }
      closeModal(); setTimeout(() => setActiveModal('success'), 80)
    } catch (err) {
      showToast(err?.response?.data?.message || 'Sale failed. Please try again.', 'error', '❌')
    } finally {
      setConfirmingPayment(false)
    }
  }
  function newOrder() { closeModal(); clearCart(); setCashReceived(''); clearVerification() }
  function numpadPress(v) { setCashReceived(prev => { if (v==='⌫') return prev.slice(0,-1); if (v==='C') return ''; if (v==='.'&&prev.includes('.')) return prev; return prev+v }) }

  const products = useMemo(() => {
    let list = activeCategory === 'all' ? catalog : catalog.filter(p => p.category_id === activeCategory)
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)) }
    return list
  }, [catalog, activeCategory, search])

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

  const B = 'var(--border)'   // border
  const S = '#6b7280'   // secondary text
  const BG2 = '#f9fafb' // secondary bg

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg-muted)', fontFamily:'Nunito,sans-serif' }}>
      <style>{`
        /* The topbar packs logo + search + clock + exit + avatar into one
           row — on narrow screens there isn't room for all of it, so drop
           the secondary bits (clock, "scanner ready" label, exit text)
           before anything is allowed to wrap or overlap. */
        @media (max-width: 640px) {
          .pos-topbar-clock { display: none; }
        }
        @media (max-width: 480px) {
          .pos-scanner-ready { display: none; }
          .pos-exit-label { display: none; }
        }
      `}</style>

      {/* TOPBAR */}
      <header style={{ height:58, flexShrink:0, display:'flex', alignItems:'center', padding:'0 16px', zIndex:200, background:'var(--bg-card)', borderBottom:`1px solid ${B}` }}>
        <div style={{ flex:'0 0 auto', display:'flex', alignItems:'center', gap:8, fontWeight:800, fontSize:15, color:'#0ab39c', whiteSpace:'nowrap' }}>
          <span style={{ fontSize:24 }}>🌾</span>
          <span style={{ lineHeight:1.2 }}>Bems Farms<br/><span style={{ fontSize:9, fontWeight:500, color:S, letterSpacing:1 }}>POINT OF SALE</span></span>
        </div>
        <div style={{ position:'relative', flex:'1 1 auto', minWidth:0, maxWidth:520, marginLeft:16 }}>
          <i className="ri-search-line" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#0ab39c', fontSize:15, pointerEvents:'none' }}/>
          <input id="scan-field" ref={scanInputRef} type="text" placeholder="Search products  ·  or scan / type barcode + Enter" autoComplete="off"
            value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key==='Enter'&&search.trim()) handleBarcodeScan(search) }}
            style={{ width:'100%', height:38, paddingLeft:38, paddingRight:96, border:'2px solid #0ab39c', borderRadius:8, fontSize:13, background:'var(--bg-card)', color:'var(--text-primary)', outline:'none', boxShadow:'0 0 0 3px rgba(10,179,156,.1)', boxSizing:'border-box' }}/>
          {search
            ? <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:S, fontSize:16 }}>✕</button>
            : <span className="pos-scanner-ready" style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:9, color:'#0ab39c', fontWeight:700, letterSpacing:.5, pointerEvents:'none', whiteSpace:'nowrap' }}>SCANNER READY</span>
          }
        </div>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end' }}>
          <div className="pos-topbar-clock" style={{ fontSize:12, color:S, textAlign:'right' }}>
            <div style={{ fontWeight:600 }}>{now.toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'})}</div>
            <div style={{ fontSize:10 }}>{now.toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})}</div>
          </div>
          {heldOrders.length > 0 && (
            <button onClick={() => setActiveModal('heldOrders')} style={{ position:'relative', fontSize:11, padding:'4px 12px', borderRadius:8, border:'2px solid #f7b84b', background:'#f7b84b', color:'var(--text-primary)', cursor:'pointer', fontWeight:700 }}>
              ⏸️ {heldOrders.length} Held
              <span style={{ position:'absolute', top:-7, right:-7, width:16, height:16, borderRadius:'50%', background:'#f06548', color:'#fff', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{heldOrders.length}</span>
            </button>
          )}
          <Link to="/dashboard" style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:8, border:`1.5px solid ${B}`, background:'var(--bg-card)', color:'var(--text-secondary)', textDecoration:'none', fontSize:12, fontWeight:600 }}>
            <i className="ri-dashboard-2-line"/><span className="pos-exit-label">Exit</span>
          </Link>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'#0ab39c', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:12 }}>
            {user ? (user.first_name?.[0]||'') + (user.last_name?.[0]||'') : 'AS'}
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="pos-body" style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* LEFT: Products */}
        <div className="pos-left" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', borderRight:`1px solid ${B}`, background:'var(--bg-card)' }}>

          {/* Quick action cards */}
          <div style={{ padding:'10px 16px', borderBottom:`1px solid ${B}`, background:BG2, flexShrink:0, display:'flex', gap:10 }}>
            {[
              { label:'Scan Basket',    sub:'Scan barcodes to build order',         icon:'ri-barcode-line',       color:'#0ab39c', badge: scanCart.length||null,  onClick:()=>{ setScanCart([]); setScanCode(''); setActiveModal('scanner') } },
              { label:'Online Orders',  sub:'Import incoming orders to cart',        icon:'ri-shopping-bag-3-line',color:'#405189', badge: onlineOrders.filter(o=>onlineStatusBucket(o.status)==='new').length||null, badgeLabel:'new', onClick:()=>{ refreshOnlineOrders(); setActiveModal('online') } },
              { label:'Goods Return',   sub:'Process a customer return & refund',    icon:'ri-arrow-go-back-line', color:'#f06548', badge: returnLogs.length||null, onClick:()=>{
                  if (!catalog.length) { showToast('Product catalog still loading — try again in a moment', 'error', '⏳'); return }
                  setReturnForm(f=>({...f,product:null,unitPrice:0,qty:1,customer:'Walk-in',phone:'',notes:'',condition:'resalable',refundMethod:'Cash',reason:POS_RETURN_REASONS[0]})); setReturnStep(1); setReturnSuccess(null); setActiveModal('return')
                } },
            ].map(c => (
              <button key={c.label} onClick={c.onClick}
                style={{ flex:1, display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:14, border:`1px solid ${c.color}28`, background:'var(--bg-card)', cursor:'pointer', textAlign:'left', boxShadow:`0 2px 8px ${c.color}18` }}>
                <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${c.color},${c.color}bb)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 4px 12px ${c.color}44` }}>
                  <i className={c.icon} style={{ fontSize:22, color:'#fff' }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)', letterSpacing:.2 }}>{c.label}</div>
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
            {categories.map(cat => {
              const active = activeCategory === cat.id; const color = catColor(cat.id === 'all' ? null : cat.id)
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
            {catalogLoading
              ? <div style={{ textAlign:'center', padding:'60px 0', color:S }}><i className="ri-loader-4-line" style={{ fontSize:32 }}/><p style={{ marginTop:12 }}>Loading products…</p></div>
              : products.length === 0
              ? <div style={{ textAlign:'center', padding:'60px 0', color:S }}><div style={{ fontSize:52 }}>🔍</div><p style={{ marginTop:12 }}>No products found</p></div>
              : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(145px,1fr))', gap:10 }}>
                  {products.map(p => {
                    const color = catColor(p.category_id); const low=p.stock>0&&p.stock<=5; const out=p.stock===0; const inCart=cart.find(i=>i.id===p.id)
                    return (
                      <button key={p.id} onClick={() => !out && addProductToCart(p)} disabled={out}
                        style={{ border: inCart?`2px solid ${color}`:`1px solid ${B}`, borderRadius:10, padding:12, background:'var(--bg-card)', cursor:out?'not-allowed':'pointer', opacity:out?.45:1, textAlign:'left', position:'relative', boxShadow: inCart?`0 0 0 3px ${color}25`:'0 1px 3px rgba(0,0,0,.06)' }}>
                        {inCart && <div style={{ position:'absolute', top:-7, right:-7, width:20, height:20, borderRadius:'50%', background:color, color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{inCart.qty}</div>}
                        {low&&!out&&<div style={{ position:'absolute', top:6, left:6, fontSize:8, fontWeight:700, color:'#f7b84b', textTransform:'uppercase' }}>Low</div>}
                        <div style={{ height:64, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:`${color}18`, overflow:'hidden', marginBottom:8 }}>
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                            : <span style={{ fontSize:36 }}>🌿</span>}
                        </div>
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
        <div className="pos-right" style={{ width:500, flexShrink:0, display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg-card)' }}>

          {/* Held orders strip */}
          {heldOrders.length > 0 && (
            <div style={{ padding:'8px 12px', background:'linear-gradient(90deg,#f7b84b18,#f7b84b08)', borderBottom:'2px solid #f7b84b50', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <button onClick={() => setActiveModal('heldOrders')}
                style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}>
                <span style={{ width:26, height:26, borderRadius:'50%', background:'#f7b84b', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>⏸</span>
                <span style={{ fontSize:11, color:'#92400e', fontWeight:800 }}>{heldOrders.length} HELD</span>
              </button>
              <div style={{ flex:1, display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none' }}>
                {heldOrders.map((h,i) => (
                  <button key={i} onClick={() => recallOrder(i)}
                    style={{ fontSize:10, padding:'3px 10px', borderRadius:10, border:'1.5px solid #f7b84b80', background:'var(--bg-card)', cursor:'pointer', color:'var(--text-primary)', whiteSpace:'nowrap', fontWeight:600, flexShrink:0 }}>
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
              <input type="text" placeholder="Search by name, phone or email…" value={custSearch} onChange={e => setCustSearch(e.target.value)}
                style={{ ...inp, height:32, padding:'0 10px', marginBottom:8 }}/>
              <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:140, overflowY:'auto' }}>
                {custSearching && <div style={{ fontSize:11, color:S, padding:'6px 10px' }}>Searching…</div>}
                {!custSearching && custResults.length===0 && <div style={{ fontSize:11, color:S, padding:'6px 10px' }}>No customers found</div>}
                {custResults.map(c => (
                  <button key={c.id} onClick={() => { setCustomer(c); setShowCustPanel(false); setCustSearch('') }}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', border: customer?.id===c.id?'1.5px solid #0ab39c':`1px solid ${B}`, borderRadius:8, background: customer?.id===c.id?'#0ab39c10':'#fff', cursor:'pointer', textAlign:'left' }}>
                    <div><div style={{ fontSize:12, fontWeight:600 }}>{c.name}</div><div style={{ fontSize:10, color:S }}>{c.phone}</div></div>
                    <div style={{ fontSize:9, color:S }}>{(c.loyalty_points||0).toLocaleString()} pts</div>
                  </button>
                ))}
              </div>
              {customer && <button onClick={() => { setCustomer(null); setShowCustPanel(false) }} style={{ width:'100%', marginTop:6, padding:'4px 0', fontSize:11, border:'1px solid #f06548', borderRadius:6, background:'transparent', cursor:'pointer', color:'#f06548' }}>Remove Customer</button>}
            </div>
          )}

          {/* Customer bar */}
          {customer && !showCustPanel && (
            <div style={{ padding:'8px 14px', background:'#0ab39c10', borderBottom:'1px solid #0ab39c30', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'#0ab39c', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:11, flexShrink:0 }}>
                {customer.name.split(' ').map(n=>n[0]).join('')}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700 }}>{customer.name}</div>
                <div style={{ fontSize:10, color:S }}>
                  {(customer.loyalty_points ?? customer.points ?? 0).toLocaleString()} loyalty pts
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
                  const color = catColor(item.category_id); const isHighlit = highlightId === item.id
                  return (
                    <div key={item.id} style={{ padding:'8px 14px', borderBottom:`1px solid ${B}`, background: isHighlit?`${color}18`:'transparent', transition:'background .4s' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:22, flexShrink:0 }}>{item.icon || '🌿'}</span>
                        <div style={{ flex:1, overflow:'hidden' }}>
                          <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                          <div style={{ fontSize:10, color:S }}>{fmt(item.price)}/{item.unit}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                          <button onClick={() => updateQty(item.id, item.qty-1)} style={{ width:22, height:22, borderRadius:'50%', border:`1px solid ${B}`, background:'transparent', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                          <input type="number" min="1" value={item.qty} onChange={e => updateQty(item.id, parseInt(e.target.value)||1)}
                            style={{ width:36, height:24, textAlign:'center', border:`1px solid ${B}`, borderRadius:4, fontSize:12, fontWeight:700, background:'var(--bg-card)', color:'var(--text-primary)', outline:'none' }}/>
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
                  borderColor: txnVerifyStatus==='found'?'#0ab39c':txnVerifyStatus==='notfound'||txnVerifyStatus==='error'?'#f06548':'var(--border)',
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
                    style={{ padding:'6px 10px', background:'var(--bg-card)', border:'1.5px solid var(--border)', borderRadius:6, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
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
                      <span style={{ color:'var(--text-muted)' }}>{k}:</span>
                      <span style={{ fontWeight:600, color:'var(--text-primary)' }}>{v}</span>
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
              { label:`VAT (${taxSettings.rate}%)`, value:fmt(vat),               show:taxSettings.enabled, color:S },
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
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text-primary)', lineHeight:1.2 }}>{m.label}</div>
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
          <div style={{ display:'flex', borderTop:`1px solid ${B}`, background:'var(--bg-card)' }}>
            {[
              { label:'Hold',    icon:'ri-pause-circle-line',   color:'#0ab39c', modal:'hold'     },
              { label:'Receipts', icon:'ri-file-text-line',      color:'#f06548', modal:'invoice'  },
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
        const scSub=scanCart.reduce((s,i)=>s+i.price*i.qty,0)
        const scVat=!taxSettings.enabled?0:taxSettings.inclusive?Math.round(scSub-scSub/(1+taxSettings.rate/100)):Math.round(scSub*(taxSettings.rate/100))
        const scTotal=taxSettings.inclusive?scSub:scSub+scVat
        return (
          <ModalBox maxWidth={780}>
            <MHead title="Scan Basket" onClose={()=>{ setScanCart([]); closeModal() }} color="linear-gradient(135deg,#0ab39c,#405189)" icon="🛒"/>
            <div style={{ padding:'16px 20px', borderBottom:`1px solid ${B}`, background:BG2, flexShrink:0 }}>
              <div style={{ display:'flex', gap:0, borderRadius:8, overflow:'hidden', border:`1.5px solid #0ab39c` }}>
                <span style={{ background:'#0ab39c', color:'#fff', display:'flex', alignItems:'center', padding:'0 16px', fontSize:20 }}><i className="ri-barcode-line"/></span>
                <input ref={scanModalInputRef} type="text" placeholder="Scan barcode or type SKU + Enter…" value={scanCode} autoFocus autoComplete="off"
                  onChange={e => setScanCode(e.target.value)} onKeyDown={e => { if (e.key==='Enter') scannerAddProduct(scanCode) }}
                  style={{ flex:1, border:'none', outline:'none', padding:'10px 14px', fontSize:15, fontWeight:500, fontFamily:'Nunito,sans-serif', color:'var(--text-primary)' }}/>
                <button onClick={() => scannerAddProduct(scanCode)} style={{ ...btnP, borderRadius:0, padding:'0 20px' }}><i className="ri-add-line"/>Add</button>
              </div>
            </div>
            <div style={{ minHeight:280, maxHeight:'45vh', overflowY:'auto' }}>
              {scanCart.length===0
                ? <div style={{ textAlign:'center', padding:'70px 20px', color:S }}><div style={{ fontSize:68 }}>📦</div><div style={{ marginTop:14, fontWeight:700, fontSize:17 }}>No items scanned yet</div><div style={{ fontSize:13, marginTop:6 }}>Scan a barcode or type a SKU above</div></div>
                : scanCart.map((item,idx) => {
                    const color = catColor(item.category_id)
                    return (
                      <div key={item.id} style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 20px', borderBottom:`1px solid ${B}` }}>
                        <div style={{ width:52, height:52, borderRadius:12, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0, overflow:'hidden' }}>{item.image_url ? <img src={item.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : (item.icon || '🌿')}</div>
                        <div style={{ flex:1, overflow:'hidden' }}>
                          <div style={{ fontWeight:600, fontSize:15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</div>
                          <div style={{ fontSize:12, color:S, marginTop:2 }}>{item.sku} · {fmt(item.price)} per {item.unit}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                          <button onClick={() => scannerUpdateQty(item.id,item.qty-1)} style={{ width:36, height:36, borderRadius:8, border:`1px solid ${B}`, background:'var(--bg-card)', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                          <span style={{ minWidth:32, textAlign:'center', fontWeight:800, fontSize:17 }}>{item.qty}</span>
                          <button onClick={() => scannerUpdateQty(item.id,item.qty+1)} style={{ width:36, height:36, borderRadius:8, border:`1px solid ${B}`, background:'var(--bg-card)', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
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
                {taxSettings.enabled && <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, fontSize:13, color:S }}><span>VAT ({taxSettings.rate}%)</span><span>{fmt(scVat)}</span></div>}
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
          <div style={{ display:'flex', borderBottom:`1px solid ${B}`, background:'var(--bg-card)', flexShrink:0 }}>
            {[
              { key:'all',        label:'All Orders',   count:onlineOrders.length },
              { key:'new',        label:'🔴 New',        count:onlineOrders.filter(o=>onlineStatusBucket(o.status)==='new').length },
              { key:'pending',    label:'🟡 Pending',    count:onlineOrders.filter(o=>onlineStatusBucket(o.status)==='pending').length },
              { key:'processing', label:'🔵 Processing', count:onlineOrders.filter(o=>onlineStatusBucket(o.status)==='processing').length },
            ].map(tab => (
              <button key={tab.key} onClick={() => setOnlineFilter(tab.key)}
                style={{ flex:1, padding:'12px 8px', border:'none', borderBottom: onlineFilter===tab.key?'3px solid #405189':'3px solid transparent', background:'transparent', fontWeight:onlineFilter===tab.key?700:500, fontSize:13, color:onlineFilter===tab.key?'#405189':S, cursor:'pointer' }}>
                {tab.label} <span style={{ marginLeft:4, background:onlineFilter===tab.key?'#405189':B, color:onlineFilter===tab.key?'#fff':S, borderRadius:20, padding:'1px 8px', fontSize:11 }}>{tab.count}</span>
              </button>
            ))}
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {onlineOrders.length===0 && (
              <div style={{ padding:40, textAlign:'center', color:S, fontSize:13 }}>No online orders awaiting fulfilment</div>
            )}
            {onlineOrders.filter(o=>onlineFilter==='all'||onlineStatusBucket(o.status)===onlineFilter).map(order => {
              const ch=channelMeta(order.channel), st=STATUS_META[onlineStatusBucket(order.status)]
              const isExpanded=expandedOrder===order.id
              const detail=orderDetails[order.id]
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
                      <div style={{ fontSize:13, marginTop:3 }}><span style={{ fontWeight:600 }}>{order.customer_name}</span><span style={{ color:S, marginLeft:8 }}>{order.customer_phone}</span></div>
                      <div style={{ fontSize:11, color:S, marginTop:2 }}>🕐 {new Date(order.created_at).toLocaleTimeString('en-NG',{hour:'numeric',minute:'2-digit'})} · {order.item_count} item{order.item_count!==1?'s':''} · <strong style={{ color:'var(--text-primary)' }}>{fmt(order.total)}</strong></div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                      <button onClick={() => { const next=isExpanded?null:order.id; setExpandedOrder(next); if (next) loadOrderDetail(order.id) }} style={{ ...btnL, padding:'5px 10px', fontSize:13 }}><i className={isExpanded?'ri-eye-off-line':'ri-eye-line'}/></button>
                      {order.status!=='processing'
                        ? <button onClick={() => loadOnlineOrderToCart(order)} disabled={loadingOrderId===order.id} style={{ ...btnP, padding:'6px 14px', fontSize:12, whiteSpace:'nowrap', opacity:loadingOrderId===order.id?0.6:1 }}><i className="ri-shopping-cart-2-line"/>{loadingOrderId===order.id?'Loading…':'Load to Cart'}</button>
                        : <span style={{ fontSize:11, color:'#299cdb', fontWeight:600 }}><i className="ri-check-double-line"/> Loaded</span>
                      }
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ marginTop:12, background:BG2, borderRadius:10, overflow:'hidden', border:`1px solid ${B}` }}>
                      {order.notes && <div style={{ padding:'8px 14px', background:'#f7b84b18', borderBottom:`1px solid ${B}`, fontSize:12, color:'#8b6914' }}><i className="ri-sticky-note-line"/> <strong>Note:</strong> {order.notes}</div>}
                      {!detail || detail.loading
                        ? <div style={{ padding:14, fontSize:12, color:S }}>Loading items…</div>
                        : detail.error
                          ? <div style={{ padding:14, fontSize:12, color:'#f06548' }}>Could not load items</div>
                          : <>
                              {detail.items.map(item => (
                                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderBottom:`1px solid ${B}` }}>
                                  <div style={{ flex:1, fontSize:13, fontWeight:500 }}>{item.name}</div>
                                  <div style={{ fontSize:12, color:S }}>× {item.quantity}</div>
                                  <div style={{ fontSize:13, fontWeight:700, minWidth:80, textAlign:'right' }}>{fmt(item.subtotal)}</div>
                                </div>
                              ))}
                              <div style={{ display:'flex', justifyContent:'flex-end', padding:'10px 14px', fontWeight:800, fontSize:14 }}>Total: <span style={{ color:'#0ab39c', marginLeft:8 }}>{fmt(order.total)}</span></div>
                            </>
                      }
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
            <div style={{ display:'flex', border:`1.5px solid var(--border)`, borderRadius:8, overflow:'hidden', marginBottom:12 }}>
              <span style={{ background:BG2, padding:'0 12px', display:'flex', alignItems:'center', fontSize:15, color:S, borderRight:`1px solid ${B}` }}>₦</span>
              <input type="number" placeholder="0.00" value={cashReceived} onChange={e => setCashReceived(e.target.value)} autoFocus
                style={{ flex:1, border:'none', outline:'none', padding:'9px 12px', fontSize:14, fontFamily:'Nunito,sans-serif', color:'var(--text-primary)' }}/>
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
              <button style={{ ...btnP, flex:1 }} disabled={!cashReceived||Number(cashReceived)<total||confirmingPayment} onClick={()=>confirmPayment('Cash')}>{confirmingPayment?'Processing…':'Submit'}</button>
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
              <div style={{ fontSize:12, color:S, lineHeight:1.6 }}>Process <strong style={{ color:'var(--text-primary)' }}>{fmt(total)}</strong> on the external POS terminal.<br/>Once confirmed, click <strong style={{ color:'#405189' }}>Confirm Payment</strong> below.</div>
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
              <button style={{ ...btnP, flex:1, background:'#405189' }} disabled={confirmingPayment} onClick={()=>confirmPayment('Card / POS')}><i className="ri-check-double-line"/>{confirmingPayment?'Processing…':'Confirm Payment'}</button>
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
              <button style={{ ...btnP, flex:1, background:'#299cdb' }} disabled={confirmingPayment} onClick={()=>confirmPayment('QR / USSD')}>{confirmingPayment?'Processing…':'Confirm Payment'}</button>
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
              <button style={{ ...btnP, flex:1 }} disabled={confirmingPayment} onClick={()=>confirmPayment('Bank Transfer')}>{confirmingPayment?'Processing…':'Submit'}</button>
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
                      <input type="number" min="0" style={inp} placeholder="0.00" value={row.amount} onChange={e=>updateSplit(i,'amount',e.target.value)}/>
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
              <div style={{ fontSize:12, color: splitMismatch ? '#dc2626' : S }}>
                Allocated: <strong>{fmt(splitAllocated)}</strong> / {fmt(total)}
              </div>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button style={{ ...btnL, flex:1 }} onClick={closeModal}>Cancel</button>
              <button style={{ ...btnP, flex:1, background:'#7c3aed' }} disabled={confirmingPayment || splitMismatch} onClick={()=>confirmPayment('Split Payment')}>{confirmingPayment?'Processing…':splitMismatch?'Allocate full amount':'Submit'}</button>
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

      {/* RECEIPTS PREVIEW */}
      {activeModal==='invoice' && (
        <ModalBox maxWidth={680}>
          <div style={{ background:'var(--bg-card)', padding:'14px 20px', borderBottom:`1px solid ${B}`, display:'flex', alignItems:'center', flexWrap:'wrap', gap:12, flexShrink:0 }}>
            <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, flex:1 }}>Receipt Preview</span>
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
                      <td style={{ padding:'8px 0', fontSize:13 }}>{item.icon || '🌿'} {item.name}</td>
                      <td style={{ padding:'8px 0', fontSize:13, textAlign:'right' }}>{item.qty}</td>
                      <td style={{ padding:'8px 0', fontSize:13, textAlign:'right' }}>{fmt(item.price)}</td>
                      <td style={{ padding:'8px 0', fontSize:13, fontWeight:600, textAlign:'right' }}>{fmt(item.price*item.qty)}</td>
                    </tr>
                  ))}
                  {discountPct>0&&<tr><td colSpan={3} style={{ textAlign:'right', fontSize:12, color:'#f06548', padding:'6px 0' }}>Discount ({discountPct}%)</td><td style={{ textAlign:'right', fontSize:12, color:'#f06548', padding:'6px 0' }}>− {fmt(discountAmt)}</td></tr>}
                  {taxSettings.enabled && <tr><td colSpan={3} style={{ textAlign:'right', fontSize:12, color:S, padding:'6px 0' }}>VAT ({taxSettings.rate}%)</td><td style={{ textAlign:'right', fontSize:12, color:S, padding:'6px 0' }}>{fmt(vat)}</td></tr>}
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
              <i className="ri-search-line" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-light)', fontSize:15 }}/>
              <input style={{ ...inp, paddingLeft:34 }} placeholder="Search receipts…" value={receiptSearch} onChange={e=>setReceiptSearch(e.target.value)}/>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:BG2, borderBottom:`1px solid ${B}` }}>
                    {['Receipt','Customer','Payment','Time','Amount','Actions'].map(h=>(
                      <th key={h} style={{ padding:'10px 12px', fontSize:11, fontWeight:700, color:S, textTransform:'uppercase', letterSpacing:'.06em', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {receiptsLoading && (
                    <tr><td colSpan={6} style={{ padding:20, textAlign:'center', fontSize:13, color:S }}>Loading…</td></tr>
                  )}
                  {!receiptsLoading && receipts.length===0 && (
                    <tr><td colSpan={6} style={{ padding:20, textAlign:'center', fontSize:13, color:S }}>No receipts found</td></tr>
                  )}
                  {!receiptsLoading && receipts.map(h=>(
                    <tr key={h.id}>
                      <td style={{ padding:'12px 12px', fontSize:13, color:'#0ab39c', fontWeight:600, borderBottom:`1px solid var(--border)` }}>{h.receipt_number}</td>
                      <td style={{ padding:'12px 12px', fontSize:13, borderBottom:`1px solid var(--border)` }}>{h.customer_name || 'Walk-in'}</td>
                      <td style={{ padding:'12px 12px', fontSize:13, borderBottom:`1px solid var(--border)` }}>{h.payment_method}</td>
                      <td style={{ padding:'12px 12px', fontSize:12, color:S, borderBottom:`1px solid var(--border)`, whiteSpace:'nowrap' }}>
                        {new Date(h.paid_at).toLocaleDateString('en-NG',{day:'numeric',month:'short'})} <span style={{ marginLeft:6 }}>{new Date(h.paid_at).toLocaleTimeString('en-NG',{hour:'numeric',minute:'2-digit'})}</span>
                      </td>
                      <td style={{ padding:'12px 12px', fontSize:13, fontWeight:600, borderBottom:`1px solid var(--border)` }}>{fmt(h.total)}</td>
                      <td style={{ padding:'12px 12px', borderBottom:`1px solid var(--border)` }}>
                        <div style={{ display:'flex', gap:4 }}>
                          <button style={{ background:BG2, border:`1px solid ${B}`, borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:13, color:'var(--text-secondary)' }}><i className="ri-eye-line"/></button>
                          <button style={{ background:BG2, border:`1px solid ${B}`, borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:13, color:'var(--text-secondary)' }}><i className="ri-printer-line"/></button>
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
          <div style={{ background:'var(--bg-card)', borderRadius:16, width:'100%', maxWidth:380, boxShadow:'0 24px 48px rgba(0,0,0,.3)' }}>
            <div style={{ padding:'32px 24px', textAlign:'center' }}>
              <div style={{ width:80, height:80, borderRadius:'50%', background:'#0ab39c', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:36 }}>✅</div>
              <h5 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:20, marginBottom:8 }}>Payment Successful!</h5>
              <p style={{ color:S, marginBottom:20 }}>Transaction processed successfully.</p>
              <div style={{ marginBottom:20 }}>
                <small style={{ color:S }}>Amount</small>
                <h4 style={{ fontWeight:800, fontSize:24, margin:'4px 0', color:'#0ab39c' }}>{fmt(successData.total)}</h4>
                <small style={{ color:S }}>
                  {successData.paidAt.toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})} · Bill ID: <span style={{ fontWeight:600, color:'var(--text-primary)' }}>{successData.orderId}</span>
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
            <div style={{ background:'var(--bg-card)', borderRadius:16, maxWidth:360, width:'100%', padding:32, textAlign:'center', boxShadow:'0 24px 48px rgba(0,0,0,.3)' }}>
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
            <div style={{ background:'var(--bg-card)', borderRadius:16, maxWidth:600, width:'100%', boxShadow:'0 24px 48px rgba(0,0,0,.3)', overflow:'hidden', maxHeight:'92vh', display:'flex', flexDirection:'column' }}>
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
                              const found=catalogByBarcode[code]||catalogByBarcode['BF-'+code]||catalogBySku[code]
                              if (found) { setReturnForm(f=>({...f,product:found,unitPrice:found.price})); showToast(`${found.name} selected`,'success','📦'); e.target.value='' }
                              else showToast('Product not found: '+code,'error','❌')
                            }
                          }}/>
                      </div>
                      <div style={{ fontSize:11, color:S, marginTop:4 }}>Or select manually from the dropdown below</div>
                    </div>
                    {returnForm.product && (
                      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:8, background:'rgba(240,101,72,.08)', border:'1px solid rgba(240,101,72,.25)' }}>
                        <i className="ri-shopping-bag-3-line" style={{ fontSize:22, color:'#f06548' }}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:13 }}>{returnForm.product.name}</div>
                          <div style={{ fontSize:11, color:S }}>{returnForm.product.sku} · ₦{returnForm.product.price.toLocaleString()} / {returnForm.product.unit}</div>
                        </div>
                        <span style={{ background:'#fee2e2', color:'#991b1b', borderRadius:50, padding:'2px 8px', fontSize:10, fontWeight:600 }}>Selected</span>
                      </div>
                    )}
                    <div>
                      <label style={LBL}>Product Being Returned *</label>
                      <select style={inp} value={returnForm.product?.id||''} onChange={e=>{ const p=catalog.find(p=>p.id===Number(e.target.value)); setReturnForm(f=>({...f,product:p,unitPrice:p.price})) }}>
                        <option value="" disabled>Select a product…</option>
                        {catalog.map(p=><option key={p.id} value={p.id}>{p.name} — ₦{p.price.toLocaleString()} / {p.unit}</option>)}
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
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ color:S }}>Product</span><span style={{ fontWeight:600 }}>{returnForm.product.name}</span></div>
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
                            style={{ flex:1, padding:'8px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Nunito,sans-serif', fontWeight:600, fontSize:12, background:returnForm.refundMethod===m?'#f06548':'var(--border)', color:returnForm.refundMethod===m?'#fff':'#374151' }}>
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
                        <span style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{h.ref||h.orderId}</span>
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
                          <span key={item.id} style={{ fontSize:10, padding:'2px 7px', background:BG2, borderRadius:4, border:`1px solid ${B}`, color:'var(--text-secondary)' }}>
                            {item.icon || '🌿'} {item.name.split(' ').slice(0,2).join(' ')} ×{item.qty}
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
        /*
          POS is a fixed-height, side-by-side terminal layout: products
          (flex:1) next to a hard-coded 500px-wide order panel, no wrap.
          That's fine down to tablet width — real POS use is a store
          terminal or tablet, not a phone — but below ~900px the 500px
          panel alone can exceed the viewport. Stack vertically instead
          of forcing horizontal overflow.
        */
        @media (max-width: 900px) {
          .pos-body  { flex-direction: column !important; overflow-y: auto !important; }
          .pos-left  { border-right: none !important; border-bottom: 1px solid var(--border); min-height: 280px; }
          .pos-right { width: 100% !important; flex-shrink: 1 !important; }
        }
      `}</style>
    </div>
  )
}
