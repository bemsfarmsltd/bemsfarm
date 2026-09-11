import { useState, useMemo } from 'react'

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

// ─── Mock Data ────────────────────────────────────────────────────────────────

const CUSTOMERS = [
  { name: 'Ngozi Obi',          phone: '08123456789', email: 'ngozi@email.com',    address: '14 Ikeja GRA, Lagos'        },
  { name: 'Adaeze Nwosu',       phone: '07098765432', email: 'adaeze@email.com',   address: '7 Lekki Phase 1, Lagos'     },
  { name: 'Bimpe Fashola',      phone: '08055566677', email: 'bimpe@gmail.com',    address: '22 Agege Motor Road, Lagos' },
  { name: 'Seun Adesanya',      phone: '09012341234', email: 'seun.a@email.com',   address: '5 Victoria Island, Lagos'   },
  { name: 'Kemi Balogun',       phone: '08167891234', email: 'kemi.b@gmail.com',   address: '18 Surulere, Lagos'         },
  { name: 'Funmi Ogundele',     phone: '08123450987', email: 'funmi@email.com',    address: '9 Gbagada, Lagos'           },
  { name: 'Rasheedat Lawal',    phone: '07023456789', email: 'rasheedat@email.com',address: '15 Maryland, Lagos'         },
  { name: 'Chukwuemeka Nze',    phone: '08098761234', email: 'emeka.n@email.com',  address: '11 Isolo, Lagos'            },
  { name: 'Yetunde Adeniyi',    phone: '08056781234', email: 'yetunde@email.com',  address: '20 Ikorodu Road, Lagos'     },
  { name: 'Corporate — Mega Catering Ltd', phone: '0700MEGA01', email: 'orders@megacatering.ng', address: '2 Marina, Lagos' },
]

const PRODUCTS_CATALOG = [
  { id: 1,  name: 'Fresh Tomatoes',         unit: 'kg',    price: 2800  },
  { id: 2,  name: 'Red Bell Pepper',        unit: 'kg',    price: 3500  },
  { id: 3,  name: 'Scotch Bonnet',          unit: 'kg',    price: 4200  },
  { id: 4,  name: 'Fresh Spinach',          unit: 'bunch', price: 800   },
  { id: 5,  name: 'Ugwu (Fluted Pumpkin)', unit: 'bunch', price: 600   },
  { id: 6,  name: 'Plantain',              unit: 'hand',  price: 2500  },
  { id: 7,  name: 'Yam (White)',           unit: 'tuber', price: 3200  },
  { id: 8,  name: 'Ginger',               unit: 'kg',    price: 5500  },
  { id: 9,  name: 'Garlic',               unit: 'kg',    price: 4800  },
  { id: 10, name: 'Palm Oil',             unit: 'litre', price: 2100  },
  { id: 11, name: 'Onion (Red)',          unit: 'kg',    price: 1800  },
  { id: 12, name: 'Sweet Corn',          unit: 'cob',   price: 400   },
]

const p = (id, qty) => {
  const prod = PRODUCTS_CATALOG.find(x => x.id === id)
  return { ...prod, qty, total: prod.price * qty }
}

const INVOICES_INIT = [
  {
    id: 'INV-2026-0142', orderId: 'ORD-2026-0142', date: '2026-06-27',
    dueDate: '2026-07-04', issuedDate: '2026-06-27',
    status: 'paid', channel: 'online',
    customer: CUSTOMERS[0],
    items: [p(1,5), p(11,3), p(3,2)],
    deliveryFee: 800, discount: 0, notes: '',
    paidDate: '2026-06-27', paymentRef: 'PST-9938422', paymentMethod: 'Paystack',
    source: 'auto',
  },
  {
    id: 'INV-2026-0141', orderId: 'ORD-2026-0141', date: '2026-06-27',
    dueDate: '2026-07-04', issuedDate: '2026-06-27',
    status: 'paid', channel: 'chef_bems',
    customer: CUSTOMERS[1],
    items: [p(1,8), p(2,4), p(6,3), p(5,5)],
    deliveryFee: 1200, discount: 0, notes: 'Jollof rice party for 25 people — Nancy AI order',
    paidDate: '2026-06-27', paymentRef: 'PST-9937100', paymentMethod: 'Paystack',
    source: 'auto',
  },
  {
    id: 'INV-2026-0140', orderId: 'ORD-2026-0140', date: '2026-06-27',
    dueDate: '2026-07-04', issuedDate: '2026-06-27',
    status: 'paid', channel: 'mobile_app',
    customer: CUSTOMERS[2],
    items: [p(4,4), p(7,2), p(10,2)],
    deliveryFee: 600, discount: 0, notes: '',
    paidDate: '2026-06-27', paymentRef: 'PST-9936700', paymentMethod: 'Paystack',
    source: 'auto',
  },
  {
    id: 'INV-2026-0139', orderId: 'ORD-2026-0139', date: '2026-06-26',
    dueDate: '2026-07-03', issuedDate: '2026-06-26',
    status: 'paid', channel: 'online',
    customer: CUSTOMERS[3],
    items: [p(8,1), p(9,1), p(12,6)],
    deliveryFee: 1500, discount: 0, notes: '',
    paidDate: '2026-06-26', paymentRef: 'PST-9935001', paymentMethod: 'Paystack',
    source: 'auto',
  },
  {
    id: 'INV-2026-0135', orderId: 'ORD-2026-0135', date: '2026-06-25',
    dueDate: '2026-07-02', issuedDate: '2026-06-25',
    status: 'paid', channel: 'chef_bems',
    customer: CUSTOMERS[7],
    items: [p(8,2), p(9,2), p(4,6)],
    deliveryFee: 1000, discount: 0, notes: 'Soup base ingredients — Nancy AI order',
    paidDate: '2026-06-25', paymentRef: 'PST-9920081', paymentMethod: 'Paystack',
    source: 'auto',
  },
  {
    id: 'INV-2026-0131', orderId: 'ORD-2026-0131', date: '2026-06-24',
    dueDate: '2026-07-01', issuedDate: '2026-06-24',
    status: 'paid', channel: 'chef_bems',
    customer: CUSTOMERS[6],
    items: [p(1,10), p(2,5), p(3,3), p(11,4)],
    deliveryFee: 1500, discount: 2000, notes: 'Egusi soup for 30 people — Nancy AI order. 5% loyalty discount applied.',
    paidDate: '2026-06-24', paymentRef: 'PST-9910022', paymentMethod: 'Paystack',
    source: 'auto',
  },
  {
    id: 'INV-2026-0128', orderId: null, date: '2026-06-23',
    dueDate: '2026-06-30', issuedDate: '2026-06-23',
    status: 'overdue', channel: 'manual',
    customer: CUSTOMERS[9],
    items: [p(1,20), p(2,10), p(3,5), p(11,8), p(10,5)],
    deliveryFee: 3000, discount: 5000, notes: 'Corporate bulk order for Mega Catering Ltd. Net 7 payment terms.',
    paidDate: null, paymentRef: null, paymentMethod: 'Bank Transfer',
    source: 'manual',
  },
  {
    id: 'INV-2026-0125', orderId: null, date: '2026-06-20',
    dueDate: '2026-06-27', issuedDate: '2026-06-20',
    status: 'sent', channel: 'manual',
    customer: CUSTOMERS[4],
    items: [p(1,3), p(2,2), p(6,4)],
    deliveryFee: 800, discount: 0, notes: 'Manual invoice for recurring customer.',
    paidDate: null, paymentRef: null, paymentMethod: 'Bank Transfer',
    source: 'manual',
  },
  {
    id: 'INV-2026-0120', orderId: null, date: '2026-06-18',
    dueDate: '2026-06-25', issuedDate: '2026-06-18',
    status: 'draft', channel: 'manual',
    customer: CUSTOMERS[8],
    items: [p(7,4), p(6,3), p(4,5)],
    deliveryFee: 600, discount: 0, notes: 'Draft — pending customer confirmation.',
    paidDate: null, paymentRef: null, paymentMethod: 'Cash',
    source: 'manual',
  },
  {
    id: 'INV-2026-0115', orderId: null, date: '2026-06-15',
    dueDate: '2026-06-22', issuedDate: '2026-06-15',
    status: 'cancelled', channel: 'manual',
    customer: CUSTOMERS[5],
    items: [p(1,5), p(3,2)],
    deliveryFee: 700, discount: 0, notes: 'Customer cancelled order before delivery.',
    paidDate: null, paymentRef: null, paymentMethod: 'Paystack',
    source: 'manual',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt       = (n) => `₦${Number(n).toLocaleString()}`
const calcSub   = (items) => items.reduce((s, i) => s + i.total, 0)
const calcTotal = (items, fee, disc) => calcSub(items) + Number(fee||0) - Number(disc||0)

const BLANK_FORM = {
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
  items: [{ name:'', qty:1, unit:'kg', price:0, total:0 }],
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Invoices() {
  const [invoices, setInvoices] = useState(INVOICES_INIT)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [selected, setSelected]         = useState(null)
  const [form, setForm]                 = useState(BLANK_FORM)
  const [markPaidRef, setMarkPaidRef]   = useState('')

  const openModal = (type, inv) => { setSelected(inv); setActiveModal(type); setMarkPaidRef('') }
  const closeModal = () => { setActiveModal(null); setSelected(null) }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:     invoices.length,
    paid:      invoices.filter(i => i.status === 'paid').length,
    outstanding: invoices.filter(i => ['sent','draft'].includes(i.status)).length,
    overdue:   invoices.filter(i => i.status === 'overdue').length,
    revenue:   invoices.filter(i => i.status === 'paid').reduce((s,i) => s + calcTotal(i.items, i.deliveryFee, i.discount), 0),
    outstanding_value: invoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s,i) => s + calcTotal(i.items, i.deliveryFee, i.discount), 0),
  }), [invoices])

  // ── Filtered ───────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return invoices
      .filter(i => {
        const okStatus = filterStatus === 'all' || i.status === filterStatus
        const okSearch = !q || i.id.toLowerCase().includes(q) || i.customer.name.toLowerCase().includes(q)
          || (i.orderId||'').toLowerCase().includes(q)
        return okStatus && okSearch
      })
      .sort((a,b) => new Date(b.date) - new Date(a.date))
  }, [invoices, search, filterStatus])

  // ── Form item management ───────────────────────────────────────────────────

  const setField = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const updateItem = (idx, field, val) => {
    setForm(prev => {
      const items = prev.items.map((item, i) => {
        if (i !== idx) return item
        const updated = { ...item, [field]: val }
        updated.total = Number(updated.qty||0) * Number(updated.price||0)
        return updated
      })
      return { ...prev, items }
    })
  }

  const addItem    = () => setForm(p => ({ ...p, items: [...p.items, { name:'', qty:1, unit:'kg', price:0, total:0 }] }))
  const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_,i) => i !== idx) }))

  const formTotal = calcTotal(form.items, form.deliveryFee, form.discount)

  // ── Actions ────────────────────────────────────────────────────────────────

  const createInvoice = (asDraft) => {
    const customer = form.customer
      ? CUSTOMERS.find(c => c.name === form.customer) || CUSTOMERS[0]
      : { name: form.customName, phone: form.customPhone, email: form.customEmail, address: form.customAddress }

    const now    = new Date()
    const id     = `INV-2026-${String(invoices.length + 200).padStart(4,'0')}`
    const today  = now.toISOString().slice(0,10)
    const status = asDraft ? 'draft' : 'sent'

    setInvoices(prev => [{
      id, orderId: null, date: today,
      dueDate: form.dueDate || new Date(now.getTime() + 7*86400000).toISOString().slice(0,10),
      issuedDate: today, status, channel: 'manual', customer,
      items: form.items.filter(i => i.name && i.qty && i.price),
      deliveryFee: Number(form.deliveryFee||0), discount: Number(form.discount||0),
      notes: form.notes, paidDate: null, paymentRef: null, paymentMethod: form.paymentMethod,
      source: 'manual',
    }, ...prev])
    setForm(BLANK_FORM)
    closeModal()
  }

  const markAsPaid = () => {
    setInvoices(prev => prev.map(i => {
      if (i.id !== selected.id) return i
      return { ...i, status:'paid', paidDate: new Date().toISOString().slice(0,10), paymentRef: markPaidRef || 'Manual' }
    }))
    closeModal()
  }

  const sendInvoice = () => {
    setInvoices(prev => prev.map(i => i.id !== selected.id ? i : { ...i, status:'sent' }))
    closeModal()
  }

  const cancelInvoice = () => {
    setInvoices(prev => prev.map(i => i.id !== selected.id ? i : { ...i, status:'cancelled' }))
    closeModal()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="container-fluid">

      {/* Page Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Invoices</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Orders</a></li>
          <li className="breadcrumb-item active">Invoices</li>
        </ul>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Invoices',    value: stats.total,                color:'#6366f1', icon:'ri-file-list-3-line',      filter:'all'     },
          { label:'Paid',              value: stats.paid,                  color:'#22c55e', icon:'ri-checkbox-circle-line',  filter:'paid'    },
          { label:'Sent / Draft',      value: stats.outstanding,          color:'#3b82f6', icon:'ri-send-plane-line',        filter:'sent'    },
          { label:'Overdue',           value: stats.overdue,              color:'#ef4444', icon:'ri-error-warning-line',     filter:'overdue' },
          { label:'Total Collected',   value: fmt(stats.revenue),         color:'#10b981', icon:'ri-money-dollar-circle-line',filter: null    },
          { label:'Outstanding Value', value: fmt(stats.outstanding_value),color:'#f59e0b', icon:'ri-time-line',             filter:'overdue' },
        ].map(c => (
          <div key={c.label} className="col-6 col-md-4 col-xl-2">
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

      {/* Filter + Actions Bar */}
      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <div className="input-group" style={{ maxWidth:280 }}>
            <span className="input-group-text"><i className="ri-search-line"/></span>
            <input className="form-control" placeholder="Invoice ref, customer, order..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          {filterStatus !== 'all' && (
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setFilterStatus('all')}>
              <i className="ri-close-line me-1"/>Clear Filter
            </button>
          )}
          <div className="ms-auto d-flex gap-2 align-items-center">
            <span className="text-muted small">{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</span>
            <button className="btn btn-sm btn-primary" onClick={() => { setForm(BLANK_FORM); setActiveModal('create') }}>
              <i className="ri-add-line me-1"/>Create Invoice
            </button>
          </div>
        </div>
        {/* Status tabs */}
        <div className="border-top px-3" style={{ overflowX:'auto' }}>
          <div className="d-flex" style={{ whiteSpace:'nowrap' }}>
            {[{ key:'all', label:'All Invoices' }, ...Object.entries(STATUS_CFG).map(([k,v]) => ({ key:k, label:v.label }))].map(t => (
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

      {/* Invoices Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Invoice</th><th>Customer</th><th>Channel</th><th>Date Issued</th>
                <th>Due Date</th><th>Amount</th><th>Payment</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-muted py-5">No invoices found</td></tr>
              )}
              {filtered.map(inv => {
                const cfg   = STATUS_CFG[inv.status]
                const chCfg = CHANNEL_CFG[inv.channel]
                const total = calcTotal(inv.items, inv.deliveryFee, inv.discount)
                const overdue = inv.status !== 'paid' && inv.status !== 'cancelled' && new Date(inv.dueDate) < new Date()
                return (
                  <tr key={inv.id}>
                    <td>
                      <div className="fw-medium text-primary" style={{ cursor:'pointer' }} onClick={() => openModal('view', inv)}>{inv.id}</div>
                      {inv.orderId && <div className="text-muted" style={{ fontSize:11 }}><i className="ri-link me-1"/>{inv.orderId}</div>}
                      {inv.source === 'manual' && <span className="badge rounded-pill bg-warning text-dark" style={{ fontSize:9 }}>Manual</span>}
                    </td>
                    <td>
                      <div className="fw-medium">{inv.customer.name}</div>
                      <div className="text-muted" style={{ fontSize:11 }}>{inv.customer.phone}</div>
                    </td>
                    <td>
                      <span className="badge rounded-pill" style={{ background:chCfg.color+'20', color:chCfg.color, fontSize:11 }}>
                        <i className={`${chCfg.icon} me-1`}/>{chCfg.label}
                      </span>
                    </td>
                    <td style={{ fontSize:13 }}>{inv.issuedDate}</td>
                    <td>
                      <div style={{ fontSize:13, color: overdue ? '#ef4444' : 'inherit', fontWeight: overdue ? 600 : 400 }}>
                        {inv.dueDate}
                      </div>
                      {overdue && <div style={{ fontSize:10, color:'#ef4444' }}>OVERDUE</div>}
                    </td>
                    <td>
                      <div className="fw-bold">{fmt(total)}</div>
                      {inv.discount > 0 && <div className="text-success" style={{ fontSize:11 }}>-{fmt(inv.discount)} disc.</div>}
                    </td>
                    <td style={{ fontSize:12 }}>{inv.paymentMethod}</td>
                    <td>
                      <span className="badge" style={{ background:cfg.bg, color:cfg.color, fontSize:11 }}>
                        <i className={`${cfg.icon} me-1`}/>{cfg.label}
                      </span>
                      {inv.paidDate && <div className="text-muted" style={{ fontSize:10 }}>{inv.paidDate}</div>}
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        <button className="btn btn-sm btn-outline-secondary" title="View" onClick={() => openModal('view', inv)}><i className="ri-eye-line"/></button>
                        {inv.status === 'draft' && <>
                          <button className="btn btn-sm btn-outline-primary" title="Send Invoice" onClick={() => openModal('send', inv)}><i className="ri-send-plane-line"/></button>
                        </>}
                        {['sent','overdue'].includes(inv.status) && <>
                          <button className="btn btn-sm btn-outline-success" title="Mark as Paid" onClick={() => openModal('markpaid', inv)}><i className="ri-checkbox-circle-line"/></button>
                        </>}
                        {!['paid','cancelled'].includes(inv.status) && <>
                          <button className="btn btn-sm btn-outline-danger" title="Cancel Invoice" onClick={() => openModal('cancel', inv)}><i className="ri-close-circle-line"/></button>
                        </>}
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
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => e.target === e.currentTarget && closeModal()}>

          {/* ── VIEW INVOICE ───────────────────────────── */}
          {activeModal === 'view' && selected && (() => {
            const total = calcTotal(selected.items, selected.deliveryFee, selected.discount)
            const cfg   = STATUS_CFG[selected.status]
            const chCfg = CHANNEL_CFG[selected.channel]
            return (
              <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:720, maxHeight:'90vh', overflowY:'auto' }}>
                {/* Invoice header band */}
                <div style={{ background:'#1e293b', color:'#fff', borderRadius:'12px 12px 0 0', padding:'24px 32px' }}>
                  <div className="d-flex align-items-start justify-content-between">
                    <div>
                      <div className="fw-bold fs-18 mb-1">BEMS FARMS</div>
                      <div style={{ fontSize:12, opacity:0.7 }}>Premium Fresh Produce · Lagos, Nigeria</div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold fs-20">{selected.id}</div>
                      <span className="badge" style={{ background:cfg.bg, color:cfg.color, fontSize:11 }}>
                        <i className={`${cfg.icon} me-1`}/>{cfg.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {/* Meta row */}
                  <div className="row g-3 mb-4">
                    <div className="col-6">
                      <div className="text-muted small mb-1">Billed To</div>
                      <div className="fw-medium">{selected.customer.name}</div>
                      <div className="small">{selected.customer.phone}</div>
                      <div className="small text-muted">{selected.customer.email}</div>
                      <div className="small text-muted">{selected.customer.address}</div>
                    </div>
                    <div className="col-6 text-end">
                      <div className="row g-2">
                        <div className="col-6 text-start"><div className="text-muted small">Issue Date</div></div>
                        <div className="col-6"><div className="small fw-medium">{selected.issuedDate}</div></div>
                        <div className="col-6 text-start"><div className="text-muted small">Due Date</div></div>
                        <div className="col-6">
                          <div className="small fw-medium" style={{ color: selected.status==='overdue' ? '#ef4444' : 'inherit' }}>
                            {selected.dueDate}
                          </div>
                        </div>
                        {selected.orderId && <>
                          <div className="col-6 text-start"><div className="text-muted small">Order Ref</div></div>
                          <div className="col-6"><div className="small fw-medium">{selected.orderId}</div></div>
                        </>}
                        <div className="col-6 text-start"><div className="text-muted small">Channel</div></div>
                        <div className="col-6">
                          <span className="badge" style={{ background:chCfg.color+'20', color:chCfg.color, fontSize:10 }}>
                            <i className={`${chCfg.icon} me-1`}/>{chCfg.label}
                          </span>
                        </div>
                        <div className="col-6 text-start"><div className="text-muted small">Payment</div></div>
                        <div className="col-6"><div className="small fw-medium">{selected.paymentMethod}</div></div>
                      </div>
                    </div>
                  </div>

                  {/* Line items */}
                  <table className="table table-sm mb-0 border">
                    <thead style={{ background:'#f8fafc' }}>
                      <tr>
                        <th>Product</th><th className="text-center">Qty</th><th className="text-end">Unit Price</th><th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.items.map((item, i) => (
                        <tr key={i}>
                          <td>{item.name}</td>
                          <td className="text-center">{item.qty} {item.unit}</td>
                          <td className="text-end">{fmt(item.price)}</td>
                          <td className="text-end">{fmt(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="d-flex justify-content-end mt-3">
                    <div style={{ minWidth:240 }}>
                      <div className="d-flex justify-content-between py-1 small text-muted">
                        <span>Subtotal</span><span>{fmt(calcSub(selected.items))}</span>
                      </div>
                      {selected.deliveryFee > 0 && (
                        <div className="d-flex justify-content-between py-1 small text-muted">
                          <span>Delivery Fee</span><span>{fmt(selected.deliveryFee)}</span>
                        </div>
                      )}
                      {selected.discount > 0 && (
                        <div className="d-flex justify-content-between py-1 small text-success">
                          <span>Discount</span><span>-{fmt(selected.discount)}</span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between py-2 fw-bold border-top mt-1" style={{ fontSize:15 }}>
                        <span>Total</span><span>{fmt(total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment record */}
                  {selected.paidDate && (
                    <div className="alert alert-success p-3 mt-3 small">
                      <i className="ri-checkbox-circle-line me-1"/>
                      <strong>Payment received</strong> on {selected.paidDate}
                      {selected.paymentRef && <> · Ref: <strong>{selected.paymentRef}</strong></>}
                    </div>
                  )}

                  {/* Notes */}
                  {selected.notes && (
                    <div className="border-top pt-3 mt-3 small text-muted">
                      <strong>Notes:</strong> {selected.notes}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="border-top pt-3 mt-3 d-flex gap-2 flex-wrap">
                    {selected.status === 'draft' && <button className="btn btn-primary btn-sm" onClick={() => { closeModal(); setTimeout(() => openModal('send', selected), 100) }}><i className="ri-send-plane-line me-1"/>Send Invoice</button>}
                    {['sent','overdue'].includes(selected.status) && <button className="btn btn-success btn-sm" onClick={() => { closeModal(); setTimeout(() => openModal('markpaid', selected), 100) }}><i className="ri-checkbox-circle-line me-1"/>Mark as Paid</button>}
                    {!['paid','cancelled'].includes(selected.status) && <button className="btn btn-outline-danger btn-sm" onClick={() => { closeModal(); setTimeout(() => openModal('cancel', selected), 100) }}><i className="ri-close-circle-line me-1"/>Cancel Invoice</button>}
                    <button className="btn btn-outline-secondary btn-sm ms-auto" onClick={closeModal}><i className="ri-close-line me-1"/>Close</button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── CREATE INVOICE ─────────────────────────── */}
          {activeModal === 'create' && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:680, maxHeight:'92vh', overflowY:'auto' }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0">Create Invoice</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
              </div>
              <div className="p-4">
                {/* Customer */}
                <div className="mb-3">
                  <label className="form-label fw-medium small">Customer</label>
                  <select className="form-select mb-2" value={form.customer} onChange={e => setField('customer', e.target.value)}>
                    <option value="">— Enter manually —</option>
                    {CUSTOMERS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  {!form.customer && (
                    <div className="row g-2">
                      <div className="col-6"><input className="form-control form-control-sm" placeholder="Full name *" value={form.customName} onChange={e => setField('customName', e.target.value)}/></div>
                      <div className="col-6"><input className="form-control form-control-sm" placeholder="Phone" value={form.customPhone} onChange={e => setField('customPhone', e.target.value)}/></div>
                      <div className="col-6"><input className="form-control form-control-sm" placeholder="Email" value={form.customEmail} onChange={e => setField('customEmail', e.target.value)}/></div>
                      <div className="col-6"><input className="form-control form-control-sm" placeholder="Address" value={form.customAddress} onChange={e => setField('customAddress', e.target.value)}/></div>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <label className="form-label fw-medium small mb-0">Line Items</label>
                    <button className="btn btn-sm btn-outline-primary" onClick={addItem}><i className="ri-add-line me-1"/>Add Item</button>
                  </div>
                  {form.items.map((item, idx) => (
                    <div key={idx} className="row g-2 mb-2 align-items-center">
                      <div className="col-4">
                        <select className="form-select form-select-sm"
                          value={item.name}
                          onChange={e => {
                            const prod = PRODUCTS_CATALOG.find(p => p.name === e.target.value)
                            if (prod) {
                              updateItem(idx, 'name', prod.name)
                              setForm(prev => {
                                const items = prev.items.map((it, i) => {
                                  if (i !== idx) return it
                                  return { ...it, name: prod.name, unit: prod.unit, price: prod.price, total: prod.price * it.qty }
                                })
                                return { ...prev, items }
                              })
                            } else {
                              updateItem(idx, 'name', e.target.value)
                            }
                          }}>
                          <option value="">Select product...</option>
                          {PRODUCTS_CATALOG.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="col-2">
                        <input type="number" className="form-control form-control-sm" placeholder="Qty" min={0}
                          value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)}/>
                      </div>
                      <div className="col-2">
                        <input className="form-control form-control-sm" placeholder="Unit" value={item.unit}
                          onChange={e => updateItem(idx, 'unit', e.target.value)}/>
                      </div>
                      <div className="col-2">
                        <input type="number" className="form-control form-control-sm" placeholder="Price"
                          value={item.price} onChange={e => updateItem(idx, 'price', e.target.value)}/>
                      </div>
                      <div className="col-1 text-end small fw-medium">{fmt(item.total)}</div>
                      <div className="col-1 text-center">
                        {form.items.length > 1 && (
                          <button className="btn btn-sm btn-outline-danger" onClick={() => removeItem(idx)}><i className="ri-delete-bin-line"/></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fees, discount, payment */}
                <div className="row g-3 mb-3">
                  <div className="col-4">
                    <label className="form-label small fw-medium">Delivery Fee (₦)</label>
                    <input type="number" className="form-control" value={form.deliveryFee} onChange={e => setField('deliveryFee', e.target.value)}/>
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-medium">Discount (₦)</label>
                    <input type="number" className="form-control" value={form.discount} onChange={e => setField('discount', e.target.value)}/>
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-medium">Due Date</label>
                    <input type="date" className="form-control" value={form.dueDate} onChange={e => setField('dueDate', e.target.value)}/>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-medium">Payment Method</label>
                    <select className="form-select" value={form.paymentMethod} onChange={e => setField('paymentMethod', e.target.value)}>
                      {['Bank Transfer','Cash','Paystack','POS'].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-medium">Notes</label>
                    <input className="form-control" placeholder="Optional notes..." value={form.notes} onChange={e => setField('notes', e.target.value)}/>
                  </div>
                </div>

                {/* Total preview */}
                <div className="d-flex justify-content-end mb-3">
                  <div className="border rounded p-3 text-end" style={{ minWidth:200 }}>
                    <div className="small text-muted">Subtotal: {fmt(calcSub(form.items))}</div>
                    {Number(form.deliveryFee) > 0 && <div className="small text-muted">+ Delivery: {fmt(form.deliveryFee)}</div>}
                    {Number(form.discount) > 0 && <div className="small text-success">- Discount: {fmt(form.discount)}</div>}
                    <div className="fw-bold mt-1">Total: {fmt(formTotal)}</div>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-outline-primary flex-fill" onClick={() => createInvoice(true)}>
                    <i className="ri-draft-line me-1"/>Save as Draft
                  </button>
                  <button className="btn btn-primary flex-fill" onClick={() => createInvoice(false)}>
                    <i className="ri-send-plane-line me-1"/>Create & Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SEND INVOICE ───────────────────────────── */}
          {activeModal === 'send' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:420 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0">Send Invoice</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
              </div>
              <div className="p-4">
                <div className="alert alert-info mb-3 small">
                  <i className="ri-information-line me-1"/>
                  This will mark the invoice as <strong>Sent</strong>. The customer will receive a notification with the invoice details.
                </div>
                <div className="card border p-3 mb-3 small">
                  <div className="fw-medium">{selected.id}</div>
                  <div className="text-muted">{selected.customer.name} · {fmt(calcTotal(selected.items, selected.deliveryFee, selected.discount))}</div>
                  <div className="text-muted">Due: {selected.dueDate} · {selected.paymentMethod}</div>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-primary flex-fill" onClick={sendInvoice}>
                    <i className="ri-send-plane-line me-1"/>Send Invoice
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── MARK AS PAID ───────────────────────────── */}
          {activeModal === 'markpaid' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:420 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0">Mark as Paid</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
              </div>
              <div className="p-4">
                <div className="card border p-3 mb-3 small">
                  <div className="fw-medium">{selected.id}</div>
                  <div className="text-muted">{selected.customer.name}</div>
                  <div className="fw-bold mt-1">{fmt(calcTotal(selected.items, selected.deliveryFee, selected.discount))}</div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium small">Payment Reference / Transaction ID (optional)</label>
                  <input className="form-control" placeholder="e.g. TRF-20260627-001, PST-XXXXX..."
                    value={markPaidRef} onChange={e => setMarkPaidRef(e.target.value)}/>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-success flex-fill" onClick={markAsPaid}>
                    <i className="ri-checkbox-circle-line me-1"/>Confirm Payment Received
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CANCEL INVOICE ─────────────────────────── */}
          {activeModal === 'cancel' && selected && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:400 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0">Cancel Invoice</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line"/></button>
              </div>
              <div className="p-4">
                <div className="alert alert-warning mb-3 small">
                  <i className="ri-alert-line me-1"/>
                  Are you sure you want to cancel <strong>{selected.id}</strong>? This action cannot be undone.
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Go Back</button>
                  <button className="btn btn-danger flex-fill" onClick={cancelInvoice}>
                    <i className="ri-close-circle-line me-1"/>Cancel Invoice
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
