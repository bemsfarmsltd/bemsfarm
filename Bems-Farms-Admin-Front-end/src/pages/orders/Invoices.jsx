import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import BemsOfficialDocument from '../../components/documents/BemsOfficialDocument'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  draft:     { label: 'Draft',     color: '#6b7280', bg: '#f3f4f6', icon: 'ri-draft-line'           },
  sent:      { label: 'Sent',      color: '#3b82f6', bg: '#dbeafe', icon: 'ri-send-plane-line'       },
  paid:      { label: 'Paid',      color: '#22c55e', bg: '#dcfce7', icon: 'ri-checkbox-circle-line'  },
  overdue:   { label: 'Overdue',   color: '#ef4444', bg: '#fee2e2', icon: 'ri-error-warning-line'    },
  cancelled: { label: 'Cancelled', color: '#9ca3af', bg: '#f3f4f6', icon: 'ri-close-circle-line'     },
}

const CHANNEL_CFG = {
  online:    { label: 'Online',         icon: 'ri-global-line',     color: '#3b82f6' },
  mobile_app:{ label: 'Mobile App',     icon: 'ri-smartphone-line', color: '#8b5cf6' },
  chef_bems: { label: 'Chef Bems AI',   icon: 'ri-robot-line',      color: '#a855f7' },
  physical:  { label: 'Physical Store', icon: 'ri-store-2-line',    color: '#10b981' },
  manual:    { label: 'Manual',         icon: 'ri-edit-line',       color: '#f59e0b' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => `₦${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const calcSub = (items = []) => (Array.isArray(items) ? items : []).reduce((s, i) => s + (Number(i.total) || (Number(i.qty || 1) * Number(i.price || 0))), 0)
const calcTotal = (items = [], fee = 0, disc = 0) => calcSub(items) + Number(fee || 0) - Number(disc || 0)

function numberToWords(num) {
  if (!num || isNaN(num)) return 'Zero Naira Only'
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  function convertGroup(n) {
    if (n === 0) return ''
    if (n < 20) return a[n] + ' '
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10] : '') + ' '
    return a[Math.floor(n / 100)] + ' Hundred ' + (n % 100 !== 0 ? 'and ' + convertGroup(n % 100) : '')
  }

  const integerPart = Math.floor(Math.abs(num))
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100)

  if (integerPart === 0 && decimalPart === 0) return 'Zero Naira Only'

  const billions = Math.floor(integerPart / 1000000000)
  const millions = Math.floor((integerPart % 1000000000) / 1000000)
  const thousands = Math.floor((integerPart % 1000000) / 1000)
  const remainder = integerPart % 1000

  let words = ''
  if (billions) words += convertGroup(billions) + 'Billion '
  if (millions) words += convertGroup(millions) + 'Million '
  if (thousands) words += convertGroup(thousands) + 'Thousand '
  if (remainder) words += convertGroup(remainder)

  words = words.trim() + ' Naira'
  if (decimalPart > 0) {
    words += ' and ' + convertGroup(decimalPart).trim() + ' Kobo'
  }
  return words + ' Only'
}

const BLANK_FORM = {
  customerId:    '',
  customer:      '',
  customName:    '',
  customPhone:   '',
  customEmail:   '',
  customAddress: '',
  paymentMethod: 'Bank Transfer',
  dueDate:       '',
  notes:         '',
  discount:      0,
  deliveryFee:   0,
  items: [{ name: '', qty: 1, unit: 'kg', price: 0, total: 0 }],
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Invoices() {
  const [invoices, setInvoices]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [customers, setCustomers]       = useState([])
  const [products, setProducts]         = useState([])
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [selected, setSelected]         = useState(null)
  const [invoiceDocType, setInvoiceDocType] = useState('proforma')
  const [form, setForm]                 = useState(BLANK_FORM)
  const [markPaidRef, setMarkPaidRef]   = useState('')
  const [submitting, setSubmitting]     = useState(false)

  // ── Fetch Invoices ──────────────────────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const params = { limit: 100 }
      if (search.trim()) params.search = search.trim()
      if (filterStatus !== 'all') params.status = filterStatus

      const res = await api.get('/admin/orders/invoices', { params })
      const rawInvoices = res.data?.invoices || []

      const normalized = rawInvoices.map(inv => {
        let items = []
        if (Array.isArray(inv.items)) {
          items = inv.items.map(it => ({
            product_id: it.product_id || null,
            name: it.name || it.product_name || 'Item',
            qty: Number(it.qty || it.quantity || 1),
            unit: it.unit || 'kg',
            price: parseFloat(it.price || it.unit_price || 0),
            total: parseFloat(it.total || ((it.qty || it.quantity || 1) * (it.price || it.unit_price || 0))),
          }))
        }

        const sub = calcSub(items)
        const dFee = parseFloat(inv.delivery_fee || inv.deliveryFee || 0)
        const dDiscount = parseFloat(inv.discount_amount || inv.discount || 0)
        const finalAmt = parseFloat(inv.amount) || (sub + dFee - dDiscount)

        return {
          id: inv.invoice_ref || `INV-${String(inv.id).padStart(4, '0')}`,
          numericId: inv.id,
          orderId: inv.order_id || inv.orderId || null,
          date: (inv.date_issued || inv.created_at || '').slice(0, 10),
          issuedDate: (inv.date_issued || inv.created_at || '').slice(0, 10),
          dueDate: (inv.due_date || inv.dueDate || '').slice(0, 10),
          status: inv.status || 'draft',
          fulfillmentStatus: inv.fulfillment_status || 'unfulfilled',
          fulfilledAt: inv.fulfilled_at ? String(inv.fulfilled_at).slice(0, 16).replace('T', ' ') : null,
          fulfilledBy: inv.fulfilled_by || null,
          channel: inv.channel || (inv.type === 'manual' ? 'manual' : 'online'),
          customer: inv.customer || {
            name: inv.customer_name || 'Customer',
            phone: inv.customer_phone || '',
            email: inv.customer_email || '',
            address: inv.customer_address || '',
          },
          items,
          deliveryFee: dFee,
          discount: dDiscount,
          amount: finalAmt,
          notes: inv.notes || '',
          paidDate: inv.paid_at ? inv.paid_at.slice(0, 10) : null,
          paymentRef: inv.payment_ref || null,
          paymentMethod: inv.payment_method || 'Bank Transfer',
          source: inv.type || 'manual',
        }
      })

      setInvoices(normalized)
    } catch (err) {
      console.error('Failed to load invoices:', err)
      toast.error('Failed to load invoices from server')
    } finally {
      setLoading(false)
    }
  }, [search, filterStatus])

  // ── Fetch Customers & Products for Modals ─────────────────────────────────
  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  useEffect(() => {
    // Fetch registered customers and product catalog for manual invoice creator
    api.get('/admin/customers?limit=100').then(res => {
      if (res.data?.customers) setCustomers(res.data.customers)
    }).catch(err => console.warn('Could not load customer list:', err.message))

    api.get('/admin/products?limit=100').then(res => {
      if (res.data?.products) setProducts(res.data.products)
    }).catch(err => console.warn('Could not load products catalog:', err.message))
  }, [])

  const openModal = (type, inv) => {
    setSelected(inv)
    setActiveModal(type)
    setMarkPaidRef('')
    if (type === 'view' && inv) {
      setInvoiceDocType(inv.status === 'paid' ? 'tax_invoice' : 'proforma')
    }
  }
  const closeModal = () => { setActiveModal(null); setSelected(null); setSubmitting(false) }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = invoices.length
    const paid = invoices.filter(i => i.status === 'paid').length
    const outstanding = invoices.filter(i => ['sent', 'draft'].includes(i.status)).length
    const overdue = invoices.filter(i => i.status === 'overdue' || (i.status !== 'paid' && i.status !== 'cancelled' && i.dueDate && new Date(i.dueDate) < new Date())).length
    const revenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || calcTotal(i.items, i.deliveryFee, i.discount)), 0)
    const outstanding_value = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.amount || calcTotal(i.items, i.deliveryFee, i.discount)), 0)
    return { total, paid, outstanding, overdue, revenue, outstanding_value }
  }, [invoices])

  // ── Filtered ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return invoices.filter(i => {
      const okStatus = filterStatus === 'all' || i.status === filterStatus
      const okSearch = !q ||
        i.id.toLowerCase().includes(q) ||
        (i.customer?.name || '').toLowerCase().includes(q) ||
        (i.customer?.phone || '').toLowerCase().includes(q) ||
        (i.orderId || '').toLowerCase().includes(q)
      return okStatus && okSearch
    })
  }, [invoices, search, filterStatus])

  // ── Form item management ───────────────────────────────────────────────────
  const setField = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleCustomerSelect = (val) => {
    if (!val) {
      setForm(p => ({ ...p, customerId: '', customer: '', customName: '', customPhone: '', customEmail: '', customAddress: '' }))
      return
    }
    const found = customers.find(c => String(c.id) === String(val) || c.name === val)
    if (found) {
      setForm(p => ({
        ...p,
        customerId: found.id,
        customer: found.name,
        customName: found.name,
        customPhone: found.phone || '',
        customEmail: found.email || '',
        customAddress: found.address || found.city || '',
      }))
    }
  }

  const updateItem = (idx, field, val) => {
    setForm(prev => {
      const items = prev.items.map((item, i) => {
        if (i !== idx) return item
        const updated = { ...item, [field]: val }
        updated.total = Number(updated.qty || 0) * Number(updated.price || 0)
        return updated
      })
      return { ...prev, items }
    })
  }

  const handleProductSelect = (idx, prodName) => {
    const prod = products.find(p => p.name === prodName || String(p.id) === String(prodName))
    if (prod) {
      const unitPrice = parseFloat(prod.unit_price || prod.price || 0)
      const unit = prod.unit || 'kg'
      const stock = parseInt(prod.stock ?? prod.stock_quantity ?? 0, 10)
      setForm(prev => {
        const items = prev.items.map((it, i) => {
          if (i !== idx) return it
          return {
            ...it,
            product_id: prod.id,
            name: prod.name,
            unit,
            price: unitPrice,
            stock,
            total: unitPrice * Number(it.qty || 1)
          }
        })
        return { ...prev, items }
      })
    } else {
      updateItem(idx, 'name', prodName)
    }
  }

  const addItem    = () => setForm(p => ({ ...p, items: [...p.items, { product_id: null, name: '', qty: 1, unit: 'kg', price: 0, total: 0, stock: null }] }))
  const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))

  const formTotal = calcTotal(form.items, form.deliveryFee, form.discount)

  // ── API Actions ────────────────────────────────────────────────────────────

  const fulfillInvoice = async (invToFulfill) => {
    const target = invToFulfill || selected
    if (!target) return
    const idOrRef = target.numericId || target.id
    try {
      setSubmitting(true)
      const res = await api.post(`/admin/orders/invoices/${idOrRef}/fulfill`)
      toast.success(res.data?.message || `Invoice ${target.id} fulfilled! Stock deducted.`)
      if (selected && (selected.id === target.id || selected.numericId === target.numericId)) {
        setSelected(prev => ({
          ...prev,
          fulfillmentStatus: 'fulfilled',
          fulfilledAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
        }))
      }
      fetchInvoices()
    } catch (err) {
      console.error('Failed to fulfill invoice:', err)
      toast.error(err.response?.data?.message || 'Failed to fulfill invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const unfulfillInvoice = async (invToUnfulfill) => {
    const target = invToUnfulfill || selected
    if (!target) return
    const idOrRef = target.numericId || target.id
    try {
      setSubmitting(true)
      const res = await api.post(`/admin/orders/invoices/${idOrRef}/unfulfill`)
      toast.success(res.data?.message || `Invoice ${target.id} unfulfilled! Stock restored.`)
      if (selected && (selected.id === target.id || selected.numericId === target.numericId)) {
        setSelected(prev => ({
          ...prev,
          fulfillmentStatus: 'unfulfilled',
          fulfilledAt: null
        }))
      }
      fetchInvoices()
    } catch (err) {
      console.error('Failed to unfulfill invoice:', err)
      toast.error(err.response?.data?.message || 'Failed to unfulfill invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const createInvoice = async (asDraft) => {
    const custName = form.customer || form.customName
    if (!custName.trim()) {
      toast.error('Please specify a customer name')
      return
    }

    const validItems = form.items.filter(i => i.name && Number(i.qty) > 0)
    if (validItems.length === 0) {
      toast.error('Please add at least one line item with quantity > 0')
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        customer_id: form.customerId || undefined,
        customer_name: custName,
        customer_phone: form.customPhone || undefined,
        customer_email: form.customEmail || undefined,
        customer_address: form.customAddress || undefined,
        due_date: form.dueDate || undefined,
        payment_method: form.paymentMethod || 'Bank Transfer',
        notes: form.notes || undefined,
        items: validItems.map(it => ({
          product_id: it.product_id || undefined,
          name: it.name,
          qty: Number(it.qty),
          unit: it.unit || 'kg',
          price: Number(it.price || 0),
        })),
        delivery_fee: Number(form.deliveryFee || 0),
        discount_amount: Number(form.discount || 0),
        status: asDraft ? 'draft' : 'sent',
      }

      await api.post('/admin/orders/invoices', payload)
      toast.success(asDraft ? 'Invoice saved as draft' : 'Invoice created and sent')
      setForm(BLANK_FORM)
      closeModal()
      fetchInvoices()
    } catch (err) {
      console.error('Failed to create invoice:', err)
      toast.error(err.response?.data?.message || 'Failed to create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const markAsPaid = async () => {
    if (!selected) return
    try {
      setSubmitting(true)
      const idOrRef = selected.numericId || selected.id
      await api.patch(`/admin/orders/invoices/${idOrRef}/status`, {
        status: 'paid',
        notes: markPaidRef ? `Paid via ref: ${markPaidRef}` : undefined,
      })
      toast.success(`Invoice ${selected.id} marked as Paid`)
      closeModal()
      fetchInvoices()
    } catch (err) {
      console.error('Failed to mark invoice as paid:', err)
      toast.error(err.response?.data?.message || 'Failed to update invoice status')
    } finally {
      setSubmitting(false)
    }
  }

  const sendInvoice = async () => {
    if (!selected) return
    try {
      setSubmitting(true)
      const idOrRef = selected.numericId || selected.id
      await api.patch(`/admin/orders/invoices/${idOrRef}/status`, { status: 'sent' })
      toast.success(`Invoice ${selected.id} marked as Sent`)
      closeModal()
      fetchInvoices()
    } catch (err) {
      console.error('Failed to send invoice:', err)
      toast.error(err.response?.data?.message || 'Failed to update invoice status')
    } finally {
      setSubmitting(false)
    }
  }

  const cancelInvoice = async () => {
    if (!selected) return
    try {
      setSubmitting(true)
      const idOrRef = selected.numericId || selected.id
      await api.patch(`/admin/orders/invoices/${idOrRef}/status`, { status: 'cancelled' })
      toast.success(`Invoice ${selected.id} has been cancelled`)
      closeModal()
      fetchInvoices()
    } catch (err) {
      console.error('Failed to cancel invoice:', err)
      toast.error(err.response?.data?.message || 'Failed to cancel invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteInvoice = async () => {
    if (!selected) return
    try {
      setSubmitting(true)
      const idOrRef = selected.numericId || selected.id
      await api.delete(`/admin/orders/invoices/${idOrRef}`)
      toast.success(`Invoice ${selected.id} deleted`)
      closeModal()
      fetchInvoices()
    } catch (err) {
      console.error('Failed to delete invoice:', err)
      toast.error(err.response?.data?.message || 'Failed to delete invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrint = async () => {
    window.print()
    if (selected) {
      const orderRef = selected.orderId || (selected.id && selected.id.startsWith('BF-') ? selected.id : null)
      if (orderRef) {
        try {
          await api.post(`/admin/orders/${orderRef}/print-invoice`)
          fetchInvoices()
        } catch (e) {
          console.warn('Could not register invoice print with order workflow:', e.message)
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="container-fluid py-2">

      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h5 className="mb-0 fw-bold">Invoices</h5>
          <span className="text-muted small">Manage manual billing, commercial invoices, and customer payment tracking</span>
        </div>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/orders">Orders</Link></li>
          <li className="breadcrumb-item active">Invoices</li>
        </ul>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Invoices',
            value: stats.total,
            glow: 'bg-card-glow-indigo',
            iconBg: '#EEF2FF',
            iconColor: '#4F46E5',
            icon: 'ri-file-list-3-line',
            filter: 'all',
            subLeft: 'Billing Registry',
            subRight: `${stats.total} Invoices`
          },
          {
            label: 'Paid Invoices',
            value: stats.paid,
            glow: 'bg-card-glow-green',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            icon: 'ri-checkbox-circle-line',
            filter: 'paid',
            subLeft: 'Settled & Closed',
            subRight: `${stats.paid} Paid`
          },
          {
            label: 'Sent / Draft',
            value: stats.outstanding,
            glow: 'bg-card-glow-blue',
            iconBg: '#EFF6FF',
            iconColor: '#2563EB',
            icon: 'ri-send-plane-line',
            filter: 'sent',
            subLeft: 'Awaiting Payment',
            subRight: `${stats.outstanding} Open`
          },
          {
            label: 'Overdue Invoices',
            value: stats.overdue,
            glow: stats.overdue > 0 ? 'bg-card-glow-red' : 'bg-card-glow-slate',
            iconBg: stats.overdue > 0 ? '#FFF1F2' : '#F8FAFC',
            iconColor: stats.overdue > 0 ? '#E11D48' : '#64748B',
            icon: 'ri-error-warning-line',
            filter: 'overdue',
            subLeft: 'Past Due Date',
            subRight: stats.overdue > 0 ? `${stats.overdue} Critical` : '0 Overdue'
          },
          {
            label: 'Total Collected',
            value: fmt(stats.revenue),
            glow: 'bg-card-glow-teal',
            iconBg: '#F0FDFA',
            iconColor: '#0D9488',
            icon: 'ri-money-dollar-circle-line',
            filter: null,
            subLeft: 'Realized Revenue',
            subRight: 'Gross Inflow'
          },
          {
            label: 'Outstanding Value',
            value: fmt(stats.outstanding_value),
            glow: 'bg-card-glow-amber',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            icon: 'ri-time-line',
            filter: 'overdue',
            subLeft: 'Unpaid Invoices',
            subRight: 'Pending Receivables'
          },
        ].map(c => (
          <div key={c.label} className="col-12 col-sm-6 col-xl-4 col-xxl-2">
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

      {/* Filter + Actions Bar */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <div className="input-group" style={{ maxWidth: 280 }}>
            <span className="input-group-text bg-light border-end-0"><i className="ri-search-line text-muted"/></span>
            <input
              className="form-control border-start-0 ps-0"
              placeholder="Invoice ref, customer, order..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {filterStatus !== 'all' && (
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setFilterStatus('all')}>
              <i className="ri-close-line me-1"/>Clear Filter
            </button>
          )}
          <button className="btn btn-sm btn-outline-secondary" onClick={fetchInvoices} title="Reload invoices">
            <i className={`ri-refresh-line me-1 ${loading ? 'ri-spin' : ''}`}/>Refresh
          </button>
          <div className="ms-auto d-flex gap-2 align-items-center">
            <span className="text-muted small">{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</span>
            <button className="btn btn-sm btn-primary" onClick={() => { setForm(BLANK_FORM); setActiveModal('create') }}>
              <i className="ri-add-line me-1"/>Create Invoice
            </button>
          </div>
        </div>
        {/* Status tabs */}
        <div className="border-top px-3" style={{ overflowX: 'auto' }}>
          <div className="d-flex" style={{ whiteSpace: 'nowrap' }}>
            {[{ key: 'all', label: 'All Invoices' }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ key: k, label: v.label }))].map(t => (
              <button
                key={t.key}
                className="btn btn-sm border-0 rounded-0 py-2 px-3"
                style={{
                  borderBottom: filterStatus === t.key ? '2px solid #6366f1' : '2px solid transparent',
                  color:        filterStatus === t.key ? '#6366f1' : '#6b7280',
                  fontWeight:   filterStatus === t.key ? 600 : 400,
                  background:   'transparent',
                }}
                onClick={() => setFilterStatus(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr style={{ fontSize: 12 }}>
                <th>Invoice Ref</th>
                <th>Customer</th>
                <th>Channel</th>
                <th>Issued</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Fulfillment</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="text-center text-muted py-5">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"/>
                    Loading live invoices...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center text-muted py-5">
                    <i className="ri-file-text-line fs-32 text-muted d-block mb-2"/>
                    No invoices found. Click "Create Invoice" to issue a new commercial invoice.
                  </td>
                </tr>
              )}
              {!loading && filtered.map(inv => {
                const cfg   = STATUS_CFG[inv.status] || STATUS_CFG.draft
                const chCfg = CHANNEL_CFG[inv.channel] || CHANNEL_CFG.online
                const total = inv.amount || calcTotal(inv.items, inv.deliveryFee, inv.discount)
                const isOverdue = inv.status !== 'paid' && inv.status !== 'cancelled' && inv.dueDate && new Date(inv.dueDate) < new Date()

                return (
                  <tr key={inv.id} style={{ fontSize: 13 }}>
                    <td>
                      <div className="fw-bold text-primary" style={{ cursor: 'pointer' }} onClick={() => openModal('view', inv)}>
                        {inv.id}
                      </div>
                      {inv.orderId && (
                        <div className="text-muted" style={{ fontSize: 11 }}>
                          <Link to={`/orders/${inv.orderId}`} className="text-decoration-none text-muted">
                            <i className="ri-link me-1"/>{inv.orderId}
                          </Link>
                        </div>
                      )}
                      {inv.source === 'manual' && (
                        <span className="badge bg-warning-subtle text-warning-emphasis" style={{ fontSize: 9 }}>Manual</span>
                      )}
                    </td>
                    <td>
                      <div className="fw-medium">{inv.customer?.name || 'Walk-in Customer'}</div>
                      {inv.customer?.phone && (
                        <div className="text-muted" style={{ fontSize: 11 }}>{inv.customer.phone}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge rounded-pill" style={{ background: chCfg.color + '20', color: chCfg.color, fontSize: 11 }}>
                        <i className={`${chCfg.icon} me-1`}/>{chCfg.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{inv.issuedDate || '—'}</td>
                    <td>
                      <div style={{ fontSize: 12, color: isOverdue ? '#ef4444' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>
                        {inv.dueDate || '—'}
                      </div>
                      {isOverdue && <span className="badge bg-danger text-white" style={{ fontSize: 9 }}>OVERDUE</span>}
                    </td>
                    <td>
                      <div className="fw-bold">{fmt(total)}</div>
                      {inv.discount > 0 && <div className="text-success" style={{ fontSize: 10 }}>-{fmt(inv.discount)} disc.</div>}
                    </td>
                    <td style={{ fontSize: 12 }}>{inv.paymentMethod}</td>
                    <td>
                      <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: 11 }}>
                        <i className={`${cfg.icon} me-1`}/>{cfg.label}
                      </span>
                      {inv.paidDate && <div className="text-muted" style={{ fontSize: 10 }}>{inv.paidDate}</div>}
                    </td>
                    <td>
                      {inv.fulfillmentStatus === 'fulfilled' ? (
                        <div>
                          <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: 11 }}>
                            <i className="ri-checkbox-circle-fill me-1"/>Stock Deducted
                          </span>
                          {inv.fulfilledAt && (
                            <div className="text-muted" style={{ fontSize: 10 }}>{inv.fulfilledAt}</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle" style={{ fontSize: 11 }}>
                            <i className="ri-time-line me-1"/>Unfulfilled
                          </span>
                          {inv.status !== 'cancelled' && (
                            <div>
                              <button
                                className="btn btn-link btn-sm text-primary p-0 text-decoration-none"
                                style={{ fontSize: 11 }}
                                onClick={() => fulfillInvoice(inv)}
                                title="Deduct stock from farm inventory"
                              >
                                <i className="ri-truck-line me-1"/>Fulfill now
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <button className="btn btn-sm btn-outline-secondary py-0 px-2" title="View Details" onClick={() => openModal('view', inv)}>
                          <i className="ri-eye-line"/>
                        </button>
                        {inv.status === 'paid' && (
                          <button
                            className="btn btn-sm btn-outline-success py-0 px-2"
                            title="Official Payment Receipt (A4)"
                            onClick={() => {
                              setSelected(inv)
                              setInvoiceDocType('receipt')
                              setActiveModal('view')
                            }}
                          >
                            <i className="ri-receipt-line"/>
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline-info py-0 px-2" title="Delivery Waybill" onClick={() => openModal('waybill', inv)}>
                          <i className="ri-file-paper-2-line"/>
                        </button>
                        {inv.status === 'draft' && (
                          <button className="btn btn-sm btn-outline-primary py-0 px-2" title="Send Invoice" onClick={() => openModal('send', inv)}>
                            <i className="ri-send-plane-line"/>
                          </button>
                        )}
                        {['sent', 'overdue', 'draft'].includes(inv.status) && (
                          <button className="btn btn-sm btn-outline-success py-0 px-2" title="Mark as Paid" onClick={() => openModal('markpaid', inv)}>
                            <i className="ri-checkbox-circle-line"/>
                          </button>
                        )}
                        {!['paid', 'cancelled'].includes(inv.status) && (
                          <button className="btn btn-sm btn-outline-danger py-0 px-2" title="Cancel Invoice" onClick={() => openModal('cancel', inv)}>
                            <i className="ri-close-circle-line"/>
                          </button>
                        )}
                        {inv.status !== 'paid' && (
                          <button className="btn btn-sm btn-light text-danger py-0 px-2" title="Delete Invoice" onClick={() => openModal('delete', inv)}>
                            <i className="ri-delete-bin-line"/>
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

      {activeModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={e => e.target === e.currentTarget && closeModal()}
        >

          {/* ── VIEW INVOICE (EXECUTIVE BRANDED A4 PROFORMA / COMMERCIAL INVOICE) ── */}
          {activeModal === 'view' && selected && (() => {
            const total = selected.amount || calcTotal(selected.items, selected.deliveryFee, selected.discount)
            const sub = calcSub(selected.items)
            const isProforma = invoiceDocType === 'proforma'
            const cfg = STATUS_CFG[selected.status] || STATUS_CFG.draft

            return (
              <div style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', position: 'fixed', inset: 0, zIndex: 1060, overflowY: 'auto', padding: '24px 12px' }}>
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
                      box-shadow: none !important;
                      border: none !important;
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

                {/* Floating Top Control Bar */}
                <div className="no-print d-flex align-items-center justify-content-between mx-auto mb-3 px-3 py-2 bg-dark text-white rounded-3 shadow" style={{ maxWidth: 840 }}>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-success text-white px-2.5 py-1.5" style={{ fontSize: 12 }}>
                      <i className="ri-file-list-3-line me-1"/>
                      {invoiceDocType === 'receipt' ? 'OFFICIAL PAYMENT RECEIPT' : (isProforma ? 'PROFORMA INVOICE' : 'COMMERCIAL TAX INVOICE')}
                    </span>
                    <span className="text-white-50 small d-none d-sm-inline">| Executive A4 Print & PDF</span>
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className={`btn ${invoiceDocType === 'proforma' ? 'btn-success fw-bold' : 'btn-outline-light'}`}
                        onClick={() => setInvoiceDocType('proforma')}
                      >
                        Proforma Invoice
                      </button>
                      <button
                        type="button"
                        className={`btn ${invoiceDocType === 'tax_invoice' ? 'btn-success fw-bold' : 'btn-outline-light'}`}
                        onClick={() => setInvoiceDocType('tax_invoice')}
                      >
                        Tax Invoice
                      </button>
                      <button
                        type="button"
                        className={`btn ${invoiceDocType === 'receipt' ? 'btn-success fw-bold' : 'btn-outline-light'}`}
                        onClick={() => setInvoiceDocType('receipt')}
                      >
                        Payment Receipt
                      </button>
                    </div>

                    <button className="btn btn-sm btn-primary fw-medium px-3 shadow-sm" onClick={handlePrint}>
                      <i className="ri-printer-line me-1"/>Print / Save PDF (A4)
                    </button>

                    <button className="btn btn-sm btn-outline-info" onClick={() => openModal('waybill', selected)}>
                      <i className="ri-file-paper-2-line me-1"/>Delivery Waybill
                    </button>

                    <button className="btn btn-sm btn-outline-light" onClick={closeModal} title="Close Preview">
                      <i className="ri-close-line fs-16"/>
                    </button>
                  </div>
                </div>

                {/* Official Bems Farms Executive Document (Invoice / Receipt) */}
                <div className="bems-doc-print-target d-flex justify-content-center">
                  <BemsOfficialDocument
                    documentType={invoiceDocType}
                    data={selected}
                  />
                </div>

                {/* Bottom Sticky Action Bar in Preview */}
                <div className="no-print d-flex align-items-center justify-content-center gap-2 mx-auto mt-3 py-2 flex-wrap" style={{ maxWidth: 840 }}>
                  <button className="btn btn-primary shadow fw-semibold px-4" onClick={handlePrint}>
                    <i className="ri-printer-line me-1.5"/>Print / Save A4 PDF
                  </button>
                  <button className="btn btn-outline-light shadow fw-semibold px-3" onClick={() => openModal('waybill', selected)}>
                    <i className="ri-file-paper-2-line me-1.5"/>View Delivery Waybill
                  </button>
                  {selected.fulfillmentStatus !== 'fulfilled' && selected.status !== 'cancelled' && (
                    <button className="btn btn-success shadow fw-semibold px-3" onClick={() => fulfillInvoice(selected)} disabled={submitting}>
                      {submitting ? <span className="spinner-border spinner-border-sm me-1"/> : <i className="ri-truck-line me-1.5"/>}
                      Fulfill & Deduct Stock
                    </button>
                  )}
                  {['sent', 'overdue', 'draft'].includes(selected.status) && (
                    <button className="btn btn-warning shadow fw-semibold px-3 text-dark" onClick={() => { closeModal(); setTimeout(() => openModal('markpaid', selected), 100) }}>
                      <i className="ri-checkbox-circle-line me-1.5"/>Mark as Paid
                    </button>
                  )}
                  <button className="btn btn-secondary shadow fw-semibold px-3" onClick={closeModal}>
                    Close Preview
                  </button>
                </div>
              </div>
            )
          })()}

          {/* ── CREATE INVOICE ─────────────────────────── */}
          {activeModal === 'create' && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 700, maxHeight: '92vh', overflowY: 'auto' }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <div>
                  <h5 className="mb-0 fw-bold">Create Invoice</h5>
                  <span className="text-muted small">Issue a custom commercial invoice for a customer or wholesale client</span>
                </div>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
              </div>
              <div className="p-4">
                {/* Customer Selection */}
                <div className="mb-3">
                  <label className="form-label fw-medium small">Customer</label>
                  <select
                    className="form-select mb-2"
                    value={form.customerId || form.customer}
                    onChange={e => handleCustomerSelect(e.target.value)}
                  >
                    <option value="">— Enter manually or select registered customer —</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} {c.company_name ? `— ${c.company_name}` : ''}
                      </option>
                    ))}
                  </select>
                  {!form.customerId && (
                    <div className="row g-2">
                      <div className="col-6">
                        <input className="form-control form-control-sm" placeholder="Full name *" value={form.customName} onChange={e => setField('customName', e.target.value)}/>
                      </div>
                      <div className="col-6">
                        <input className="form-control form-control-sm" placeholder="Phone" value={form.customPhone} onChange={e => setField('customPhone', e.target.value)}/>
                      </div>
                      <div className="col-6">
                        <input className="form-control form-control-sm" placeholder="Email" value={form.customEmail} onChange={e => setField('customEmail', e.target.value)}/>
                      </div>
                      <div className="col-6">
                        <input className="form-control form-control-sm" placeholder="Delivery address" value={form.customAddress} onChange={e => setField('customAddress', e.target.value)}/>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <label className="form-label fw-medium small mb-0">Line Items</label>
                    <button className="btn btn-sm btn-outline-primary" onClick={addItem}>
                      <i className="ri-add-line me-1"/>Add Item
                    </button>
                  </div>
                  {form.items.map((item, idx) => (
                    <div key={idx} className="row g-2 mb-2 align-items-center">
                      <div className="col-4">
                        <input
                          className="form-control form-control-sm"
                          placeholder="Type or select product..."
                          list={`product-options-${idx}`}
                          value={item.name}
                          onChange={e => handleProductSelect(idx, e.target.value)}
                        />
                        <datalist id={`product-options-${idx}`}>
                          {products.map(p => (
                            <option key={p.id} value={p.name}>
                              ₦{Number(p.unit_price || p.price || 0).toLocaleString()} / {p.unit || 'kg'} (Stock: {p.stock ?? p.stock_quantity ?? 0})
                            </option>
                          ))}
                        </datalist>
                        {item.stock !== undefined && item.stock !== null && (
                          <div style={{ fontSize: 10, color: item.stock > 0 ? '#15803d' : '#b91c1c' }} className="mt-0.5">
                            <i className="ri-archive-line me-1"/>Live Stock: <strong>{item.stock} {item.unit}</strong>
                          </div>
                        )}
                      </div>
                      <div className="col-2">
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="Qty"
                          min={0.1}
                          step="any"
                          value={item.qty}
                          onChange={e => updateItem(idx, 'qty', e.target.value)}
                        />
                      </div>
                      <div className="col-2">
                        <input
                          className="form-control form-control-sm"
                          placeholder="Unit"
                          value={item.unit}
                          onChange={e => updateItem(idx, 'unit', e.target.value)}
                        />
                      </div>
                      <div className="col-2">
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="Price"
                          min={0}
                          value={item.price}
                          onChange={e => updateItem(idx, 'price', e.target.value)}
                        />
                      </div>
                      <div className="col-1 text-end small fw-medium">{fmt(item.total)}</div>
                      <div className="col-1 text-center">
                        {form.items.length > 1 && (
                          <button className="btn btn-sm btn-outline-danger py-0 px-2" onClick={() => removeItem(idx)}>
                            <i className="ri-delete-bin-line"/>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fees, discount, payment */}
                <div className="row g-3 mb-3">
                  <div className="col-4">
                    <label className="form-label small fw-medium">Delivery Fee (₦)</label>
                    <input type="number" min={0} className="form-control" value={form.deliveryFee} onChange={e => setField('deliveryFee', e.target.value)}/>
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-medium">Discount (₦)</label>
                    <input type="number" min={0} className="form-control" value={form.discount} onChange={e => setField('discount', e.target.value)}/>
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-medium">Due Date</label>
                    <input type="date" className="form-control" value={form.dueDate} onChange={e => setField('dueDate', e.target.value)}/>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-medium">Payment Method</label>
                    <select className="form-select" value={form.paymentMethod} onChange={e => setField('paymentMethod', e.target.value)}>
                      {['Bank Transfer', 'Cash', 'Paystack', 'POS', 'Wallet'].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-medium">Notes / Terms</label>
                    <input className="form-control" placeholder="e.g. Net 7 days payment terms..." value={form.notes} onChange={e => setField('notes', e.target.value)}/>
                  </div>
                </div>

                {/* Total preview */}
                <div className="d-flex justify-content-end mb-3">
                  <div className="border rounded p-3 text-end" style={{ minWidth: 220 }}>
                    <div className="small text-muted">Subtotal: {fmt(calcSub(form.items))}</div>
                    {Number(form.deliveryFee) > 0 && <div className="small text-muted">+ Delivery: {fmt(form.deliveryFee)}</div>}
                    {Number(form.discount) > 0 && <div className="small text-success">- Discount: {fmt(form.discount)}</div>}
                    <div className="fw-bold mt-1 fs-16">Total: {fmt(formTotal)}</div>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={submitting}>Cancel</button>
                  <button className="btn btn-outline-primary flex-fill" onClick={() => createInvoice(true)} disabled={submitting}>
                    {submitting ? <span className="spinner-border spinner-border-sm me-1"/> : <i className="ri-draft-line me-1"/>}
                    Save as Draft
                  </button>
                  <button className="btn btn-primary flex-fill" onClick={() => createInvoice(false)} disabled={submitting}>
                    {submitting ? <span className="spinner-border spinner-border-sm me-1"/> : <i className="ri-send-plane-line me-1"/>}
                    Create & Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SEND INVOICE ───────────────────────────── */}
          {activeModal === 'send' && selected && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0 fw-bold">Send Invoice</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
              </div>
              <div className="p-4">
                <div className="alert alert-info mb-3 small">
                  <i className="ri-information-line me-1"/>
                  This will mark invoice <strong>{selected.id}</strong> as <strong>Sent</strong> and open it for customer payment.
                </div>
                <div className="card border p-3 mb-3 small">
                  <div className="fw-bold">{selected.id}</div>
                  <div className="text-muted">{selected.customer?.name} · {fmt(selected.amount)}</div>
                  <div className="text-muted">Due: {selected.dueDate || 'Immediate'} · {selected.paymentMethod}</div>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={submitting}>Cancel</button>
                  <button className="btn btn-primary flex-fill" onClick={sendInvoice} disabled={submitting}>
                    {submitting ? <span className="spinner-border spinner-border-sm me-1"/> : <i className="ri-send-plane-line me-1"/>}
                    Confirm Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── MARK AS PAID ───────────────────────────── */}
          {activeModal === 'markpaid' && selected && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0 fw-bold">Mark as Paid</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
              </div>
              <div className="p-4">
                <div className="card border p-3 mb-3 small bg-light">
                  <div className="fw-bold">{selected.id}</div>
                  <div className="text-muted">{selected.customer?.name}</div>
                  <div className="fw-bold mt-1 fs-16 text-success">{fmt(selected.amount)}</div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium small">Payment Reference / Bank Transaction ID</label>
                  <input
                    className="form-control"
                    placeholder="e.g. TRF-2026-001, PST-XXXXX..."
                    value={markPaidRef}
                    onChange={e => setMarkPaidRef(e.target.value)}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={submitting}>Cancel</button>
                  <button className="btn btn-success flex-fill" onClick={markAsPaid} disabled={submitting}>
                    {submitting ? <span className="spinner-border spinner-border-sm me-1"/> : <i className="ri-checkbox-circle-line me-1"/>}
                    Confirm Paid
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CANCEL INVOICE ─────────────────────────── */}
          {activeModal === 'cancel' && selected && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 400 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0 fw-bold">Cancel Invoice</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
              </div>
              <div className="p-4">
                <div className="alert alert-warning mb-3 small">
                  <i className="ri-alert-line me-1"/>
                  Are you sure you want to cancel invoice <strong>{selected.id}</strong>?
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={submitting}>Go Back</button>
                  <button className="btn btn-danger flex-fill" onClick={cancelInvoice} disabled={submitting}>
                    {submitting ? <span className="spinner-border spinner-border-sm me-1"/> : <i className="ri-close-circle-line me-1"/>}
                    Cancel Invoice
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── DELETE INVOICE ─────────────────────────── */}
          {activeModal === 'delete' && selected && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 400 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0 fw-bold text-danger">Delete Invoice</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
              </div>
              <div className="p-4">
                <div className="alert alert-danger mb-3 small">
                  <i className="ri-error-warning-line me-1"/>
                  Are you sure you want to permanently delete <strong>{selected.id}</strong>? This action cannot be undone.
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={submitting}>Cancel</button>
                  <button className="btn btn-danger flex-fill" onClick={deleteInvoice} disabled={submitting}>
                    {submitting ? <span className="spinner-border spinner-border-sm me-1"/> : <i className="ri-delete-bin-line me-1"/>}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── DELIVERY WAYBILL MODAL ────────────────── */}
          {activeModal === 'waybill' && selected && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 760, maxHeight: '92vh', overflowY: 'auto' }}>
              <div className="d-flex align-items-center justify-content-between p-3 border-bottom bg-light">
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-file-paper-2-fill fs-20 text-primary"/>
                  <h6 className="mb-0 fw-bold">Official Delivery Note & Waybill</h6>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                    <i className="ri-printer-line me-1"/>Print Waybill
                  </button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>
              
              <div className="p-4" style={{ color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {/* Waybill Document Header */}
                <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                  <div>
                    <h4 className="fw-bolder mb-1 text-success">BEMS FARMS LIMITED</h4>
                    <div className="small text-muted">Premium Farm Produce, Fish & Poultry · Wholesale & B2B Division</div>
                    <div className="small text-muted">Km 5, Farm Settlement Road, Umuahia, Abia State · Tel: +234 800 000 2367</div>
                  </div>
                  <div className="text-end">
                    <div className="badge bg-dark text-white fs-12 px-3 py-1 text-uppercase tracking-wider">DELIVERY NOTE / WAYBILL</div>
                    <div className="fw-bold fs-16 mt-2">WB-{selected.id.replace('INV-', '')}</div>
                    <div className="small text-muted">Ref Inv: {selected.id}</div>
                    <div className="small text-muted">Date: {new Date().toLocaleDateString('en-GB')}</div>
                  </div>
                </div>

                {/* Consignee & Dispatch Details */}
                <div className="row g-3 mb-3 p-3 bg-light rounded-3">
                  <div className="col-6 border-end">
                    <div className="text-uppercase fw-bold text-muted fs-11 tracking-wider mb-1">CONSIGNEE / DELIVER TO:</div>
                    <div className="fw-bold fs-15">{selected.customer?.name || 'Walk-in / Institutional Client'}</div>
                    {selected.customer?.address && <div className="small text-dark mt-1"><i className="ri-map-pin-line me-1 text-muted"/>{selected.customer.address}</div>}
                    {selected.customer?.phone && <div className="small text-dark"><i className="ri-phone-line me-1 text-muted"/>{selected.customer.phone}</div>}
                  </div>
                  <div className="col-6 ps-3">
                    <div className="text-uppercase fw-bold text-muted fs-11 tracking-wider mb-1">DISPATCH SPECIFICATIONS:</div>
                    <div className="small"><strong>Dispatch Status:</strong> {selected.fulfillmentStatus === 'fulfilled' ? 'Stock Dispatched' : 'Pending Dispatch'}</div>
                    <div className="small"><strong>Dispatch Date:</strong> {selected.fulfilledAt || '—'}</div>
                    <div className="small"><strong>Channel:</strong> {selected.channel?.toUpperCase() || 'DIRECT B2B'}</div>
                    <div className="small"><strong>Payment Terms:</strong> {selected.paymentMethod} ({selected.status?.toUpperCase()})</div>
                    {selected.notes && <div className="small text-muted mt-1"><strong>Instructions:</strong> {selected.notes}</div>}
                  </div>
                </div>

                {/* Items Table */}
                <table className="table table-bordered mb-4">
                  <thead className="table-light">
                    <tr style={{ fontSize: 12 }}>
                      <th style={{ width: 40 }} className="text-center">#</th>
                      <th>Item Description</th>
                      <th className="text-center" style={{ width: 120 }}>Qty Ordered</th>
                      <th className="text-center" style={{ width: 140 }}>Qty Delivered</th>
                      <th style={{ width: 120 }} className="text-center">Packaging / Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((it, idx) => (
                      <tr key={idx} style={{ fontSize: 13 }}>
                        <td className="text-center text-muted">{idx + 1}</td>
                        <td className="fw-medium">{it.name}</td>
                        <td className="text-center">{it.qty}</td>
                        <td className="text-center fw-bold">{it.qty}</td>
                        <td className="text-center text-muted">{it.unit || 'kg'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Handling & Receiving Notes */}
                <div className="alert alert-secondary py-2 px-3 small mb-4">
                  <strong>Goods Received in Good Order:</strong> The receiver agrees that all perishable goods listed above have been inspected upon arrival, found fresh and in sound condition, matching specifications.
                </div>

                {/* Three-party Signatures Section */}
                <div className="row g-3 pt-3 border-top text-center" style={{ fontSize: 11 }}>
                  <div className="col-4 border-end">
                    <div className="fw-bold mb-4">DISPATCHED BY (FARM)</div>
                    <div className="border-bottom mx-3 mb-1" style={{ height: 32 }}></div>
                    <div>Authorized Sign & Date</div>
                  </div>
                  <div className="col-4 border-end">
                    <div className="fw-bold mb-4">DRIVER / CARRIER</div>
                    <div className="border-bottom mx-3 mb-1" style={{ height: 32 }}></div>
                    <div>Driver Name & Vehicle Reg</div>
                  </div>
                  <div className="col-4">
                    <div className="fw-bold mb-4">RECEIVED BY (HOTEL / CLIENT)</div>
                    <div className="border-bottom mx-3 mb-1" style={{ height: 32 }}></div>
                    <div>Receiver Name, Stamp & Sign</div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
