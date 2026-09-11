import { useState, useMemo } from 'react'

const PRODUCTS   = ['Basmati Rice (5kg)','Fresh Tomatoes','Palm Oil (25L)','Catfish (Smoked)','Fresh Pepper','Chicken (Whole)','Fresh Yam','Cassava Flour','Fresh Milk','Plantain (Bunch)']
const WAREHOUSES = ['Main Store','Cold Room','Dry Store','Farm Store']
const REASONS    = ['Spoilage / Rotting','Expiry Date Passed','Physical Damage','Theft','Flood / Water Damage','Rodent / Pest Damage','Incorrect Handling','Quality Rejection']
const STAFF      = ['Admin','Emeka Adeola','Ngozi Bello','Tunde Okafor','Chike Nwosu']

const REASON_ICON = {
  'Spoilage / Rotting':   'ri-leaf-line',
  'Expiry Date Passed':   'ri-time-line',
  'Physical Damage':      'ri-hammer-line',
  'Theft':                'ri-spy-line',
  'Flood / Water Damage': 'ri-drop-line',
  'Rodent / Pest Damage': 'ri-bug-line',
  'Incorrect Handling':   'ri-error-warning-line',
  'Quality Rejection':    'ri-close-circle-line',
}

const STATUS_CFG = {
  pending:       { label:'Pending',         cls:'bg-secondary-subtle text-secondary', dot:'#adb5bd' },
  investigating: { label:'Investigating',   cls:'bg-info-subtle text-info',           dot:'#299cdb' },
  confirmed:     { label:'Confirmed Loss',  cls:'bg-danger-subtle text-danger',       dot:'#f06548' },
  dismissed:     { label:'Dismissed',       cls:'bg-success-subtle text-success',     dot:'#0ab39c' },
}

// Movement trail type config
const MOVE_CFG = {
  stock_in:    { icon:'ri-arrow-down-circle-line', color:'#0ab39c',  label:'Stock In'        },
  transfer:    { icon:'ri-exchange-line',          color:'#299cdb',  label:'Transfer'        },
  adjustment:  { icon:'ri-equalizer-line',         color:'#f7b84b',  label:'Adjustment'      },
  sale:        { icon:'ri-shopping-cart-2-line',   color:'#405189',  label:'Sold'            },
  dispatch:    { icon:'ri-truck-line',             color:'#6559cc',  label:'Dispatched'      },
  loss:        { icon:'ri-error-warning-line',     color:'#f06548',  label:'Loss Reported'   },
}

const MOCK_LOST = [
  {
    id:1, ref:'LST-2026-001', date:'2026-06-10', product:'Fresh Tomatoes',
    category:'Vegetables', qty:12, unit:'kg', unitCost:800, totalLoss:9600,
    reason:'Spoilage / Rotting', warehouse:'Main Store', reportedBy:'Emeka Adeola',
    status:'confirmed', investigator:'Ngozi Bello', investigatedOn:'2026-06-11',
    findings:'Tomatoes found with mould due to improper cold storage. Cold Room was at fault — power outage on June 9 caused temperature to rise. Estimated 12kg unfit for sale.',
    resolution:'confirmed',
    timeline:[
      { date:'2026-06-10', action:'Report submitted',     by:'Emeka Adeola', icon:'ri-file-add-line',        color:'#405189' },
      { date:'2026-06-11', action:'Investigation opened', by:'Ngozi Bello',  icon:'ri-search-eye-line',      color:'#299cdb' },
      { date:'2026-06-11', action:'Findings documented',  by:'Ngozi Bello',  icon:'ri-file-text-line',       color:'#f7b84b' },
      { date:'2026-06-11', action:'Loss confirmed',       by:'Admin',        icon:'ri-checkbox-circle-line', color:'#f06548' },
    ],
    movementTrail:[
      { date:'2026-05-28', type:'stock_in',   ref:'SI-2026-038', action:'Stock received',      detail:'25kg received from Eze Farm Supplies',          qty:'+25 kg', balance:'25 kg', by:'Emeka Adeola', warehouse:'Main Store',  extra:'Batch #B-038 · Supplier: Eze Farm Supplies' },
      { date:'2026-06-01', type:'sale',       ref:'ORD-2026-092', action:'Sold to customer',    detail:'5kg sold — Order #ORD-2026-092',                 qty:'-5 kg',  balance:'20 kg', by:'Ngozi Bello',  warehouse:'Main Store',  extra:'Customer: Mrs. Adaeze Okafor · POS checkout' },
      { date:'2026-06-04', type:'sale',       ref:'ORD-2026-105', action:'Sold to customer',    detail:'3kg sold — Order #ORD-2026-105',                 qty:'-3 kg',  balance:'17 kg', by:'Tunde Okafor', warehouse:'Main Store',  extra:'Customer: Bayo Farms Ltd · Invoice INV-105' },
      { date:'2026-06-07', type:'transfer',   ref:'TRF-2026-011', action:'Transfer to Cold Room','detail':'5kg moved to Cold Room for temperature control',qty:'-5 kg',  balance:'12 kg', by:'Admin',        warehouse:'Main Store → Cold Room', extra:'Reason: Heat control during June heat' },
      { date:'2026-06-09', type:'adjustment', ref:'ADJ-2026-019', action:'Stock adjustment',    detail:'3kg quarantined — early signs of spoilage noted', qty:'-3 kg',  balance:'9 kg',  by:'Emeka Adeola', warehouse:'Main Store',  extra:'Ref note: Discolouration on surface. Set aside.' },
      { date:'2026-06-10', type:'loss',       ref:'LST-2026-001', action:'Loss reported',       detail:'12kg confirmed total loss — mould/spoilage',      qty:'-9 kg',  balance:'0 kg',  by:'Emeka Adeola', warehouse:'Main Store',  extra:'Incident investigation opened' },
    ],
  },
  {
    id:2, ref:'LST-2026-002', date:'2026-06-12', product:'Fresh Milk (1L)',
    category:'Dairy & Eggs', qty:5, unit:'bottle', unitCost:900, totalLoss:4500,
    reason:'Expiry Date Passed', warehouse:'Cold Room', reportedBy:'Ngozi Bello',
    status:'confirmed', investigator:'Admin', investigatedOn:'2026-06-12',
    findings:'5 bottles of milk exceeded expiry date. Stock rotation procedure was not followed — FIFO not applied when restocking on June 8.',
    resolution:'confirmed',
    timeline:[
      { date:'2026-06-12', action:'Report submitted',     by:'Ngozi Bello', icon:'ri-file-add-line',        color:'#405189' },
      { date:'2026-06-12', action:'Investigation opened', by:'Admin',       icon:'ri-search-eye-line',      color:'#299cdb' },
      { date:'2026-06-12', action:'Loss confirmed',       by:'Admin',       icon:'ri-checkbox-circle-line', color:'#f06548' },
    ],
    movementTrail:[
      { date:'2026-06-01', type:'stock_in',   ref:'SI-2026-041', action:'Stock received',    detail:'20 bottles received from Lagos Dairy Co.',        qty:'+20 btl', balance:'20 btl', by:'Ngozi Bello',  warehouse:'Cold Room',  extra:'Batch #D-041 · Expiry: 2026-06-14 · Supplier: Lagos Dairy Co.' },
      { date:'2026-06-03', type:'sale',       ref:'ORD-2026-097', action:'Sold to customer', detail:'8 bottles sold — Order #ORD-2026-097',             qty:'-8 btl',  balance:'12 btl', by:'Tunde Okafor', warehouse:'Cold Room',  extra:'Customer: Sunshine Bakery · Bulk order' },
      { date:'2026-06-06', type:'sale',       ref:'ORD-2026-103', action:'Sold to customer', detail:'4 bottles sold — Order #ORD-2026-103',             qty:'-4 btl',  balance:'8 btl',  by:'Emeka Adeola', warehouse:'Cold Room',  extra:'Customer: Walk-in customer (POS)' },
      { date:'2026-06-08', type:'stock_in',   ref:'SI-2026-047', action:'New stock added',   detail:'12 new bottles restocked (FIFO not followed)',     qty:'+12 btl', balance:'20 btl', by:'Ngozi Bello',  warehouse:'Cold Room',  extra:'⚠ Old stock not moved to front — FIFO breach noted' },
      { date:'2026-06-11', type:'sale',       ref:'ORD-2026-118', action:'Sold to customer', detail:'3 bottles sold — Order #ORD-2026-118',             qty:'-3 btl',  balance:'17 btl', by:'Chike Nwosu',  warehouse:'Cold Room',  extra:'Customer: Mrs. Funke Abiodun' },
      { date:'2026-06-12', type:'loss',       ref:'LST-2026-002', action:'Loss reported',    detail:'5 bottles expired (old batch, FIFO not followed)', qty:'-5 btl',  balance:'12 btl', by:'Ngozi Bello',  warehouse:'Cold Room',  extra:'Root cause: FIFO not applied on June 8 restock' },
    ],
  },
  {
    id:3, ref:'LST-2026-003', date:'2026-06-15', product:'Palm Oil (25L)',
    category:'Grains & Carbs', qty:6, unit:'crate', unitCost:18000, totalLoss:108000,
    reason:'Expiry Date Passed', warehouse:'Main Store', reportedBy:'Admin',
    status:'confirmed', investigator:'Admin', investigatedOn:'2026-06-15',
    findings:'6 crates of palm oil exceeded shelf life. Items were stored at the back of the shelf and overlooked during the June 1 audit. Supplier batch date was Feb 2026 with 4-month shelf life.',
    resolution:'confirmed',
    timeline:[
      { date:'2026-06-15', action:'Report submitted', by:'Admin', icon:'ri-file-add-line',        color:'#405189' },
      { date:'2026-06-15', action:'Loss confirmed',   by:'Admin', icon:'ri-checkbox-circle-line', color:'#f06548' },
    ],
    movementTrail:[
      { date:'2026-02-10', type:'stock_in',   ref:'SI-2026-004', action:'Stock received',    detail:'20 crates received from Agro Kings Ltd',           qty:'+20 crt', balance:'20 crt', by:'Emeka Adeola', warehouse:'Main Store', extra:'Batch #P-004 · Mfg: Feb 2026 · Shelf life: 4 months · Expiry: Jun 2026' },
      { date:'2026-03-15', type:'sale',       ref:'ORD-2026-031', action:'Sold to customer', detail:'4 crates sold',                                     qty:'-4 crt',  balance:'16 crt', by:'Ngozi Bello',  warehouse:'Main Store', extra:'Customer: Amaka Restaurant' },
      { date:'2026-04-02', type:'dispatch',   ref:'SO-2026-015',  action:'Dispatched',       detail:'6 crates dispatched to branch delivery',            qty:'-6 crt',  balance:'10 crt', by:'Tunde Okafor', warehouse:'Main Store', extra:'Dispatch to Lekki outlet via driver #D-003' },
      { date:'2026-06-01', type:'adjustment', ref:'ADJ-2026-011', action:'Audit check',      detail:'June audit — 6 crates at back of shelf unscanned',  qty:'0',       balance:'10 crt', by:'Admin',        warehouse:'Main Store', extra:'⚠ 6 crates at rear not scanned — audit gap identified' },
      { date:'2026-06-15', type:'loss',       ref:'LST-2026-003', action:'Loss reported',    detail:'6 crates expired — shelf life elapsed Feb–Jun',    qty:'-6 crt',  balance:'4 crt',  by:'Admin',        warehouse:'Main Store', extra:'4 remaining crates still within shelf life' },
    ],
  },
  {
    id:4, ref:'LST-2026-004', date:'2026-06-18', product:'Chicken (Whole)',
    category:'Meat', qty:3, unit:'kg', unitCost:2800, totalLoss:8400,
    reason:'Spoilage / Rotting', warehouse:'Cold Room', reportedBy:'Emeka Adeola',
    status:'confirmed', investigator:'Emeka Adeola', investigatedOn:'2026-06-18',
    findings:'Chicken found spoiled. Cold Room door was left open for extended period during loading on June 17. Temperature log shows 15°C for 4 hours (target <4°C).',
    resolution:'confirmed',
    timeline:[
      { date:'2026-06-18', action:'Report submitted',     by:'Emeka Adeola', icon:'ri-file-add-line',        color:'#405189' },
      { date:'2026-06-18', action:'Investigation opened', by:'Emeka Adeola', icon:'ri-search-eye-line',      color:'#299cdb' },
      { date:'2026-06-18', action:'Loss confirmed',       by:'Admin',        icon:'ri-checkbox-circle-line', color:'#f06548' },
    ],
    movementTrail:[
      { date:'2026-06-14', type:'stock_in',   ref:'SI-2026-052', action:'Stock received',    detail:'15kg received from Farm Direct Nigeria',            qty:'+15 kg', balance:'15 kg', by:'Emeka Adeola', warehouse:'Cold Room',  extra:'Batch #C-052 · Supplier: Farm Direct Nigeria · Received fresh same-day' },
      { date:'2026-06-15', type:'sale',       ref:'ORD-2026-121', action:'Sold to customer', detail:'4kg sold — Order #ORD-2026-121',                    qty:'-4 kg',  balance:'11 kg', by:'Ngozi Bello',  warehouse:'Cold Room',  extra:'Customer: Eko Catering Services' },
      { date:'2026-06-16', type:'sale',       ref:'ORD-2026-125', action:'Sold to customer', detail:'3kg sold — Order #ORD-2026-125',                    qty:'-3 kg',  balance:'8 kg',  by:'Tunde Okafor', warehouse:'Cold Room',  extra:'Customer: Walk-in customer (POS)' },
      { date:'2026-06-17', type:'transfer',   ref:'TRF-2026-018', action:'Stock handling',   detail:'Loading activity — Cold Room door open 4hrs',       qty:'0',      balance:'8 kg',  by:'Chike Nwosu',  warehouse:'Cold Room',  extra:'⚠ Temperature breach: 15°C recorded for 4 hours. Target <4°C.' },
      { date:'2026-06-17', type:'adjustment', ref:'ADJ-2026-024', action:'Quality check',    detail:'5kg quarantined — possible temperature compromise', qty:'-5 kg',  balance:'3 kg',  by:'Emeka Adeola', warehouse:'Cold Room',  extra:'Remaining 3kg set aside pending inspection' },
      { date:'2026-06-18', type:'loss',       ref:'LST-2026-004', action:'Loss reported',    detail:'3kg confirmed spoiled — temperature breach cause',  qty:'-3 kg',  balance:'0 kg',  by:'Emeka Adeola', warehouse:'Cold Room',  extra:'5kg quarantined batch also written off' },
    ],
  },
  {
    id:5, ref:'LST-2026-005', date:'2026-06-21', product:'Cassava Flour',
    category:'Grains & Carbs', qty:2, unit:'pack', unitCost:1100, totalLoss:2200,
    reason:'Rodent / Pest Damage', warehouse:'Dry Store', reportedBy:'Tunde Okafor',
    status:'investigating', investigator:'Tunde Okafor', investigatedOn:'2026-06-22',
    findings:'Rodent activity detected in Dry Store. Two packs of cassava flour chewed through. Pest control team has been notified. Inspection ongoing to assess full extent of damage.',
    resolution:'',
    timeline:[
      { date:'2026-06-21', action:'Report submitted',      by:'Tunde Okafor', icon:'ri-file-add-line',   color:'#405189' },
      { date:'2026-06-22', action:'Investigation opened',  by:'Tunde Okafor', icon:'ri-search-eye-line', color:'#299cdb' },
      { date:'2026-06-22', action:'Pest control notified', by:'Admin',        icon:'ri-phone-line',      color:'#f7b84b' },
    ],
    movementTrail:[
      { date:'2026-06-10', type:'stock_in',   ref:'SI-2026-049', action:'Stock received',    detail:'30 packs received from Bems Processing Unit',     qty:'+30 pck', balance:'30 pck', by:'Tunde Okafor', warehouse:'Dry Store', extra:'Batch #CF-049 · Supplier: Bems Processing Unit' },
      { date:'2026-06-13', type:'sale',       ref:'ORD-2026-114', action:'Sold to customer', detail:'10 packs sold — Order #ORD-2026-114',              qty:'-10 pck', balance:'20 pck', by:'Ngozi Bello',  warehouse:'Dry Store', extra:'Customer: Mama Cee Restaurant · Bulk order' },
      { date:'2026-06-17', type:'sale',       ref:'ORD-2026-129', action:'Sold to customer', detail:'8 packs sold — Order #ORD-2026-129',               qty:'-8 pck',  balance:'12 pck', by:'Emeka Adeola', warehouse:'Dry Store', extra:'Customer: Walk-in customers (POS)' },
      { date:'2026-06-20', type:'adjustment', ref:'ADJ-2026-026', action:'Shelf inspection', detail:'Minor rodent droppings noticed near shelf B3',     qty:'0',       balance:'12 pck', by:'Tunde Okafor', warehouse:'Dry Store', extra:'⚠ Rodent signs first noticed — pest control not yet called' },
      { date:'2026-06-21', type:'loss',       ref:'LST-2026-005', action:'Loss reported',    detail:'2 packs chewed through by rodents',               qty:'-2 pck',  balance:'10 pck', by:'Tunde Okafor', warehouse:'Dry Store', extra:'Investigation ongoing. 10 remaining packs under review.' },
    ],
  },
  {
    id:6, ref:'LST-2026-006', date:'2026-06-24', product:'Fresh Pepper',
    category:'Vegetables', qty:4, unit:'kg', unitCost:700, totalLoss:2800,
    reason:'Physical Damage', warehouse:'Main Store', reportedBy:'Ngozi Bello',
    status:'pending', investigator:'', investigatedOn:'',
    findings:'',
    resolution:'',
    timeline:[
      { date:'2026-06-24', action:'Report submitted', by:'Ngozi Bello', icon:'ri-file-add-line', color:'#405189' },
    ],
    movementTrail:[
      { date:'2026-06-20', type:'stock_in',   ref:'SI-2026-057', action:'Stock received',   detail:'20kg received from Local Farmers Market',         qty:'+20 kg', balance:'20 kg', by:'Ngozi Bello',  warehouse:'Main Store', extra:'Batch #PEP-057 · Supplier: Local Farmers Market · Received fresh' },
      { date:'2026-06-21', type:'sale',       ref:'ORD-2026-133', action:'Sold to customer','detail':'6kg sold — Order #ORD-2026-133',                  qty:'-6 kg',  balance:'14 kg', by:'Emeka Adeola', warehouse:'Main Store', extra:'Customer: Chidi Catering Ltd' },
      { date:'2026-06-22', type:'sale',       ref:'ORD-2026-138', action:'Sold to customer','detail':'5kg sold — Order #ORD-2026-138',                  qty:'-5 kg',  balance:'9 kg',  by:'Tunde Okafor', warehouse:'Main Store', extra:'Customer: Walk-in (POS)' },
      { date:'2026-06-24', type:'sale',       ref:'ORD-2026-144', action:'Sold to customer','detail':'5kg sold — Order #ORD-2026-144',                  qty:'-5 kg',  balance:'4 kg',  by:'Ngozi Bello',  warehouse:'Main Store', extra:'Customer: Mrs. Chioma Eze' },
      { date:'2026-06-24', type:'loss',       ref:'LST-2026-006', action:'Loss reported',   detail:'4kg physically damaged — cause under investigation',qty:'-4 kg',  balance:'0 kg',  by:'Ngozi Bello',  warehouse:'Main Store', extra:'Awaiting investigation assignment' },
    ],
  },
]

function nextRef(list) {
  const max = list.reduce((m, r) => Math.max(m, Number(r.ref.split('-')[2])), 0)
  return `LST-2026-${String(max + 1).padStart(3,'0')}`
}

export default function LostItems() {
  const [records, setRecords]                   = useState(MOCK_LOST)
  const [search, setSearch]                     = useState('')
  const [filterStatus, setFilterStatus]         = useState('all')
  const [activeModal, setActiveModal]           = useState(null)
  const [editItem, setEditItem]                 = useState(null)
  const [investigateItem, setInvestigateItem]   = useState(null)
  const [invForm, setInvForm]                   = useState({ investigator:'', findings:'', resolution:'' })
  const [rightTab, setRightTab]                 = useState('timeline')  // 'timeline' | 'movement'

  const [form, setForm] = useState({
    ref:'', date:'', product:PRODUCTS[0], category:'Vegetables', qty:1, unit:'kg',
    unitCost:0, reason:REASONS[0], warehouse:'Main Store', reportedBy:'Admin', status:'pending'
  })

  const filtered = useMemo(() => records.filter(r => {
    const m = r.product.toLowerCase().includes(search.toLowerCase()) ||
              r.ref.toLowerCase().includes(search.toLowerCase()) ||
              r.reason.toLowerCase().includes(search.toLowerCase())
    return m && (filterStatus === 'all' || r.status === filterStatus)
  }), [records, search, filterStatus])

  const stats = useMemo(() => ({
    total:        records.length,
    investigating:records.filter(r => r.status === 'investigating').length,
    pending:      records.filter(r => r.status === 'pending').length,
    totalVal:     records.filter(r => r.status === 'confirmed').reduce((s,r) => s + r.totalLoss, 0),
  }), [records])

  function openAdd() {
    setEditItem(null)
    setForm({ ref:nextRef(records), date:new Date().toISOString().slice(0,10), product:PRODUCTS[0], category:'Vegetables', qty:1, unit:'kg', unitCost:0, reason:REASONS[0], warehouse:'Main Store', reportedBy:'Admin', status:'pending' })
    setActiveModal('form')
  }
  function openEdit(r) { setEditItem(r); setForm({ ...r }); setActiveModal('form') }
  function openDelete(r) { setEditItem(r); setActiveModal('delete') }
  function openInvestigate(r) {
    setInvestigateItem(r)
    setInvForm({ investigator:r.investigator || '', findings:r.findings || '', resolution:r.resolution || '' })
    setRightTab('timeline')
    setActiveModal('investigate')
  }
  function closeModal() { setActiveModal(null); setEditItem(null); setInvestigateItem(null) }

  const computedTotal = Number(form.qty) * Number(form.unitCost)

  function saveForm(e) {
    e.preventDefault()
    const today = new Date().toISOString().slice(0,10)
    if (editItem) {
      setRecords(prev => prev.map(r => r.id === editItem.id ? { ...r, ...form, totalLoss:computedTotal } : r))
    } else {
      setRecords(prev => [...prev, {
        id: Math.max(...prev.map(r=>r.id))+1, ...form, totalLoss:computedTotal,
        investigator:'', investigatedOn:'', findings:'', resolution:'',
        timeline:[{ date:today, action:'Report submitted', by:form.reportedBy, icon:'ri-file-add-line', color:'#405189' }],
        movementTrail:[],
      }])
    }
    closeModal()
  }

  function confirmDelete() {
    setRecords(prev => prev.filter(r => r.id !== editItem.id))
    closeModal()
  }

  function saveInvestigation(resolution) {
    const today = new Date().toISOString().slice(0,10)
    setRecords(prev => prev.map(r => {
      if (r.id !== investigateItem.id) return r
      const newStatus = resolution === 'confirmed' ? 'confirmed' : resolution === 'dismissed' ? 'dismissed' : 'investigating'
      const added = []
      if (r.status === 'pending' && invForm.investigator)
        added.push({ date:today, action:'Investigation opened',   by:invForm.investigator,         icon:'ri-search-eye-line',      color:'#299cdb' })
      if (invForm.findings && invForm.findings !== r.findings)
        added.push({ date:today, action:'Findings documented',    by:invForm.investigator||'Admin', icon:'ri-file-text-line',       color:'#f7b84b' })
      if (resolution === 'confirmed')
        added.push({ date:today, action:'Loss confirmed',         by:invForm.investigator||'Admin', icon:'ri-checkbox-circle-line', color:'#f06548' })
      if (resolution === 'dismissed')
        added.push({ date:today, action:'Report dismissed',       by:invForm.investigator||'Admin', icon:'ri-close-circle-line',    color:'#0ab39c' })
      return { ...r, status:newStatus, investigator:invForm.investigator, investigatedOn:today, findings:invForm.findings, resolution, timeline:[...(r.timeline||[]), ...added] }
    }))
    closeModal()
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3">
        <h6 className="flex-grow-1 mb-0">Lost &amp; Damaged Items</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Inventory</a></li>
          <li className="breadcrumb-item active">Lost &amp; Damaged</li>
        </ul>
      </div>

      {stats.pending > 0 && (
        <div className="alert border-0 mb-4 d-flex align-items-center gap-2" style={{ background:'#fff8ec', borderLeft:'3px solid #f7b84b' }}>
          <i className="ri-time-line fs-18 text-warning"></i>
          <span><strong>{stats.pending} report{stats.pending > 1 ? 's' : ''}</strong> waiting for investigation.</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Reports',       value:stats.total,                            icon:'ri-file-damage-line',         color:'#405189', filter:'all'          },
          { label:'Pending Review',      value:stats.pending,                          icon:'ri-time-line',                color:'#f7b84b', filter:'pending'       },
          { label:'Under Investigation', value:stats.investigating,                    icon:'ri-search-eye-line',          color:'#299cdb', filter:'investigating'  },
          { label:'Confirmed Value Lost',value:`₦${records.filter(r=>r.status==='confirmed').reduce((s,r)=>s+r.totalLoss,0).toLocaleString()}`, icon:'ri-money-dollar-circle-line', color:'#f06548', filter:'confirmed' },
        ].map(c => (
          <div className="col-6 col-xl-3" key={c.label}>
            <div className="card mb-0 cursor-pointer" style={{ borderLeft:`3px solid ${c.color}` }} onClick={() => setFilterStatus(c.filter)}>
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width:44, height:44, background:`${c.color}1a` }}>
                  <i className={`${c.icon} fs-20`} style={{ color:c.color }}></i>
                </div>
                <div>
                  <div className="fs-18 fw-bold" style={{ color:c.color }}>{c.value}</div>
                  <div className="text-muted" style={{ fontSize:12 }}>{c.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div className="position-relative">
            <input className="form-control ps-9" placeholder="Search product, reason, ref…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ minWidth:240 }} />
            <i className="ri-search-line position-absolute top-50 start-0 ms-3 translate-middle-y text-muted"></i>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap">
            <select className="form-select" style={{ width:'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Records</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="confirmed">Confirmed</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openAdd}>
              <i className="ri-add-line"></i> Report Loss
            </button>
          </div>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle text-nowrap mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Ref No</th>
                  <th className="fw-medium text-muted">Date</th>
                  <th className="fw-medium text-muted">Product</th>
                  <th className="fw-medium text-muted">Qty Lost</th>
                  <th className="fw-medium text-muted">Total Loss</th>
                  <th className="fw-medium text-muted">Reason</th>
                  <th className="fw-medium text-muted">Warehouse</th>
                  <th className="fw-medium text-muted">Reported By</th>
                  <th className="fw-medium text-muted">Investigator</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-5 text-muted">
                    <i className="ri-file-damage-line fs-2 d-block mb-2"></i>No loss reports found
                  </td></tr>
                )}
                {filtered.map(r => {
                  const sc   = STATUS_CFG[r.status]
                  const icon = REASON_ICON[r.reason] || 'ri-error-warning-line'
                  return (
                    <tr key={r.id} style={{ borderLeft:`3px solid ${sc.dot}` }}>
                      <td>
                        <button className="btn btn-link p-0 fw-medium text-danger text-decoration-none" onClick={() => openInvestigate(r)}>
                          {r.ref}
                        </button>
                      </td>
                      <td>{r.date}</td>
                      <td>
                        <div className="fw-medium">{r.product}</div>
                        <div className="text-muted" style={{ fontSize:11 }}>{r.category}</div>
                      </td>
                      <td className="fw-bold text-danger">{r.qty} {r.unit}</td>
                      <td className="fw-bold text-danger">₦{r.totalLoss.toLocaleString()}</td>
                      <td>
                        <div className="d-flex align-items-center gap-1" style={{ fontSize:12 }}>
                          <i className={`${icon} text-muted`}></i>
                          <span style={{ maxWidth:130, whiteSpace:'normal' }}>{r.reason}</span>
                        </div>
                      </td>
                      <td><span className="badge bg-light text-dark border">{r.warehouse}</span></td>
                      <td style={{ fontSize:12, color:'#6c757d' }}>{r.reportedBy}</td>
                      <td style={{ fontSize:12 }}>
                        {r.investigator
                          ? <span className="d-flex align-items-center gap-1"><i className="ri-user-search-line text-info"></i>{r.investigator}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-soft-info p-1 px-2" onClick={() => openInvestigate(r)} title="Investigate"><i className="ri-search-eye-line"></i></button>
                          <button className="btn btn-sm btn-soft-primary p-1 px-2" onClick={() => openEdit(r)} title="Edit"><i className="ri-pencil-line"></i></button>
                          <button className="btn btn-sm btn-soft-danger p-1 px-2" onClick={() => openDelete(r)} title="Delete"><i className="ri-delete-bin-line"></i></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-muted" style={{ fontSize:13 }}>Showing {filtered.length} of {records.length} records</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          INVESTIGATE MODAL
      ══════════════════════════════════════════════════════════ */}
      {activeModal === 'investigate' && investigateItem && (() => {
        const r   = investigateItem
        const sc  = STATUS_CFG[r.status]
        const icon = REASON_ICON[r.reason] || 'ri-error-warning-line'
        return (
          <>
            <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
              <div className="modal-dialog modal-dialog-centered modal-xl">
                <div className="modal-content">

                  {/* Header */}
                  <div className="modal-header" style={{ background:'#f8f9fa' }}>
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <i className="ri-search-eye-line fs-18 text-info"></i>
                        <h6 className="modal-title mb-0 fw-bold">Incident Investigation — {r.ref}</h6>
                        <span className={`badge ${sc.cls} ms-1`}>{sc.label}</span>
                      </div>
                      <div className="text-muted" style={{ fontSize:12 }}>
                        Reported {r.date} by <strong>{r.reportedBy}</strong> · {r.warehouse}
                      </div>
                    </div>
                    <button className="btn-close" onClick={closeModal}></button>
                  </div>

                  <div className="modal-body p-0">
                    <div className="row g-0" style={{ minHeight:560 }}>

                      {/* ── LEFT: Incident details + investigation form ── */}
                      <div className="col-lg-7 p-4 border-end">

                        {/* Incident summary */}
                        <div className="card mb-4" style={{ background:'#fff8ec', border:'1px solid #f7b84b33' }}>
                          <div className="card-body py-3">
                            <div className="d-flex align-items-start gap-3">
                              <div className="rounded d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width:44, height:44, background:'#f7b84b22' }}>
                                <i className={`${icon} fs-20 text-warning`}></i>
                              </div>
                              <div className="flex-grow-1">
                                <div className="fw-bold fs-15">{r.product}</div>
                                <div className="text-muted mb-2" style={{ fontSize:12 }}>{r.category} · {r.warehouse}</div>
                                <div className="row g-2">
                                  <div className="col-4">
                                    <div style={{ fontSize:11, color:'#adb5bd' }}>QTY LOST</div>
                                    <div className="fw-bold text-danger">{r.qty} {r.unit}</div>
                                  </div>
                                  <div className="col-4">
                                    <div style={{ fontSize:11, color:'#adb5bd' }}>UNIT COST</div>
                                    <div className="fw-bold">₦{r.unitCost.toLocaleString()}</div>
                                  </div>
                                  <div className="col-4">
                                    <div style={{ fontSize:11, color:'#adb5bd' }}>TOTAL LOSS</div>
                                    <div className="fw-bold text-danger">₦{r.totalLoss.toLocaleString()}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-top d-flex align-items-center gap-2" style={{ fontSize:13 }}>
                              <i className={`${icon} text-warning`}></i>
                              <span className="fw-medium">Reason:</span>
                              <span>{r.reason}</span>
                            </div>
                          </div>
                        </div>

                        {/* Investigation form */}
                        <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2">
                          <i className="ri-user-search-line text-info"></i> Investigation Details
                        </h6>

                        <div className="mb-3">
                          <label className="form-label fw-medium" style={{ fontSize:13 }}>Assigned Investigator</label>
                          <select className="form-select form-select-sm" value={invForm.investigator}
                            onChange={e => setInvForm(f=>({...f,investigator:e.target.value}))}
                            disabled={r.status==='confirmed'||r.status==='dismissed'}>
                            <option value="">— Assign investigator —</option>
                            {STAFF.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>

                        <div className="mb-3">
                          <label className="form-label fw-medium" style={{ fontSize:13 }}>
                            Findings <span className="text-muted fw-normal ms-1">(root cause, evidence, corrective actions)</span>
                          </label>
                          <textarea className="form-control" rows="5"
                            placeholder="Describe findings, root cause, contributing factors, evidence gathered…"
                            value={invForm.findings}
                            onChange={e => setInvForm(f=>({...f,findings:e.target.value}))}
                            disabled={r.status==='confirmed'||r.status==='dismissed'}
                            style={{ fontSize:13 }} />
                        </div>

                        {/* Resolution buttons */}
                        {r.status !== 'confirmed' && r.status !== 'dismissed' && (
                          <div className="p-3 rounded" style={{ background:'#f8f9fa', border:'1px solid #dee2e6' }}>
                            <div className="fw-medium mb-2" style={{ fontSize:13 }}>Resolution</div>
                            <div className="d-flex gap-2 flex-wrap">
                              <button className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                                onClick={() => saveInvestigation('investigating')} disabled={!invForm.investigator}>
                                <i className="ri-search-eye-line"></i> Save &amp; Keep Investigating
                              </button>
                              <button className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                                onClick={() => saveInvestigation('confirmed')}
                                disabled={!invForm.investigator||!invForm.findings.trim()}>
                                <i className="ri-checkbox-circle-line"></i> Confirm Loss
                              </button>
                              <button className="btn btn-sm btn-success d-flex align-items-center gap-1"
                                onClick={() => saveInvestigation('dismissed')} disabled={!invForm.investigator}>
                                <i className="ri-close-circle-line"></i> Dismiss Report
                              </button>
                            </div>
                            {(!invForm.investigator||!invForm.findings.trim()) && (
                              <div className="text-muted mt-2" style={{ fontSize:11 }}>
                                <i className="ri-information-line me-1"></i>Assign investigator and document findings to confirm or dismiss.
                              </div>
                            )}
                          </div>
                        )}

                        {(r.status==='confirmed'||r.status==='dismissed') && (
                          <div className={`p-3 rounded d-flex align-items-center gap-2 ${r.status==='confirmed'?'bg-danger-subtle':'bg-success-subtle'}`}>
                            <i className={`fs-18 ${r.status==='confirmed'?'ri-checkbox-circle-line text-danger':'ri-close-circle-line text-success'}`}></i>
                            <span style={{ fontSize:13 }}>
                              Case <strong>{r.status==='confirmed'?'closed as confirmed loss':'dismissed'}</strong>
                              {r.investigatedOn ? ` on ${r.investigatedOn}` : ''} by <strong>{r.investigator}</strong>.
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ── RIGHT: Timeline / Movement Trail ── */}
                      <div className="col-lg-5 d-flex flex-column" style={{ background:'#fafbfc' }}>

                        {/* Tab switcher */}
                        <div className="d-flex border-bottom" style={{ background:'#f0f3f9' }}>
                          {[
                            { id:'timeline', icon:'ri-timeline-view',      label:'Incident Timeline'    },
                            { id:'movement', icon:'ri-route-line',          label:'Goods Movement Trail' },
                          ].map(t => (
                            <button key={t.id}
                              className={`btn btn-sm flex-grow-1 rounded-0 d-flex align-items-center justify-content-center gap-2 py-3 ${rightTab===t.id?'btn-primary':'btn-link text-muted text-decoration-none'}`}
                              style={{ fontSize:12, fontWeight: rightTab===t.id ? 600 : 400, borderBottom: rightTab===t.id ? 'none' : '1px solid transparent' }}
                              onClick={() => setRightTab(t.id)}>
                              <i className={t.icon}></i> {t.label}
                            </button>
                          ))}
                        </div>

                        <div className="p-4 flex-grow-1 overflow-auto" style={{ maxHeight:480 }}>

                          {/* ── INCIDENT TIMELINE TAB ── */}
                          {rightTab === 'timeline' && (
                            <>
                              <div className="position-relative">
                                {(r.timeline||[]).length > 1 && (
                                  <div style={{ position:'absolute', left:19, top:24, bottom:24, width:2, background:'#dee2e6', zIndex:0 }}></div>
                                )}
                                {(r.timeline||[]).map((ev, i) => (
                                  <div key={i} className="d-flex gap-3 mb-4 position-relative" style={{ zIndex:1 }}>
                                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                      style={{ width:38, height:38, background:ev.color+'22', border:`2px solid ${ev.color}` }}>
                                      <i className={`${ev.icon} fs-16`} style={{ color:ev.color }}></i>
                                    </div>
                                    <div className="flex-grow-1 pt-1">
                                      <div className="fw-medium" style={{ fontSize:13 }}>{ev.action}</div>
                                      <div className="d-flex gap-2 mt-1" style={{ fontSize:11, color:'#adb5bd' }}>
                                        <span><i className="ri-user-line me-1"></i>{ev.by}</span>
                                        <span>·</span>
                                        <span><i className="ri-calendar-line me-1"></i>{ev.date}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {r.status === 'pending' && (
                                  <div className="d-flex gap-3 mb-2">
                                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                      style={{ width:38, height:38, background:'#f8f9fa', border:'2px dashed #dee2e6' }}>
                                      <i className="ri-question-mark text-muted fs-16"></i>
                                    </div>
                                    <div className="pt-1"><div className="text-muted" style={{ fontSize:13 }}>Awaiting investigation…</div></div>
                                  </div>
                                )}
                              </div>

                              {/* Case summary */}
                              <div className="mt-4 p-3 rounded border" style={{ fontSize:12 }}>
                                <div className="fw-medium mb-2 text-muted">CASE SUMMARY</div>
                                <div className="d-flex justify-content-between mb-1"><span className="text-muted">Report Date</span><span>{r.date}</span></div>
                                <div className="d-flex justify-content-between mb-1"><span className="text-muted">Investigated On</span><span>{r.investigatedOn||'—'}</span></div>
                                <div className="d-flex justify-content-between mb-1"><span className="text-muted">Investigator</span><span>{r.investigator||'—'}</span></div>
                                <div className="d-flex justify-content-between"><span className="text-muted">Value at Risk</span><span className="fw-bold text-danger">₦{r.totalLoss.toLocaleString()}</span></div>
                              </div>
                            </>
                          )}

                          {/* ── GOODS MOVEMENT TRAIL TAB ── */}
                          {rightTab === 'movement' && (
                            <>
                              {/* Summary chips */}
                              <div className="d-flex flex-wrap gap-2 mb-4">
                                {Object.entries(
                                  (r.movementTrail||[]).reduce((acc, m) => { acc[m.type] = (acc[m.type]||0)+1; return acc }, {})
                                ).map(([type, count]) => {
                                  const cfg = MOVE_CFG[type] || MOVE_CFG.adjustment
                                  return (
                                    <span key={type} className="badge d-flex align-items-center gap-1 px-2 py-1"
                                      style={{ background:cfg.color+'18', color:cfg.color, border:`1px solid ${cfg.color}44`, fontSize:11 }}>
                                      <i className={cfg.icon}></i> {cfg.label} ×{count}
                                    </span>
                                  )
                                })}
                              </div>

                              {/* Movement timeline */}
                              {(r.movementTrail||[]).length === 0 && (
                                <div className="text-muted text-center py-4" style={{ fontSize:13 }}>
                                  <i className="ri-route-line fs-2 d-block mb-2"></i>No movement trail recorded
                                </div>
                              )}

                              <div className="position-relative">
                                {(r.movementTrail||[]).length > 1 && (
                                  <div style={{ position:'absolute', left:19, top:24, bottom:24, width:2, background:'#dee2e6', zIndex:0 }}></div>
                                )}
                                {(r.movementTrail||[]).map((mv, i) => {
                                  const cfg = MOVE_CFG[mv.type] || MOVE_CFG.adjustment
                                  const isLoss = mv.type === 'loss'
                                  return (
                                    <div key={i} className="d-flex gap-3 mb-4 position-relative" style={{ zIndex:1 }}>
                                      <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                        style={{ width:38, height:38, background:cfg.color+'22', border:`2px solid ${cfg.color}` }}>
                                        <i className={`${cfg.icon} fs-15`} style={{ color:cfg.color }}></i>
                                      </div>
                                      <div className="flex-grow-1 pt-1">
                                        <div className="d-flex align-items-center justify-content-between gap-2">
                                          <div className="fw-medium" style={{ fontSize:13 }}>{mv.action}</div>
                                          <div className="d-flex gap-1 flex-shrink-0">
                                            <span className="badge" style={{ fontSize:11, background:cfg.color+'18', color:cfg.color }}>
                                              {mv.qty}
                                            </span>
                                            <span className="badge bg-light text-dark border" style={{ fontSize:10 }}>
                                              ={mv.balance}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-muted mt-1" style={{ fontSize:12 }}>{mv.detail}</div>

                                        <div className="d-flex flex-wrap gap-x-3 gap-1 mt-1" style={{ fontSize:11, color:'#adb5bd', columnGap:12 }}>
                                          <span><i className="ri-user-line me-1"></i>{mv.by}</span>
                                          <span>·</span>
                                          <span><i className="ri-calendar-line me-1"></i>{mv.date}</span>
                                          <span>·</span>
                                          <span><i className="ri-map-pin-line me-1"></i>{mv.warehouse}</span>
                                        </div>

                                        {mv.ref && (
                                          <span className="badge bg-light border text-muted mt-1" style={{ fontSize:10 }}>
                                            <i className="ri-hashtag me-1"></i>{mv.ref}
                                          </span>
                                        )}

                                        {mv.extra && (
                                          <div className="mt-2 p-2 rounded" style={{
                                            fontSize:11,
                                            background: isLoss ? '#fef0ed' : mv.extra.startsWith('⚠') ? '#fff8ec' : '#f8f9fa',
                                            border: `1px solid ${isLoss ? '#fecaca' : mv.extra.startsWith('⚠') ? '#f7b84b44' : '#e9ecef'}`,
                                            color: isLoss ? '#991b1b' : mv.extra.startsWith('⚠') ? '#92400e' : '#6c757d',
                                          }}>
                                            {mv.extra}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Movement summary */}
                              {(r.movementTrail||[]).length > 0 && (() => {
                                const trail = r.movementTrail
                                const totalIn    = trail.filter(m=>m.type==='stock_in').reduce((s,m)=>s+Number(m.qty.replace(/[^0-9]/g,'')),0)
                                const totalSold  = trail.filter(m=>m.type==='sale'||m.type==='dispatch').reduce((s,m)=>s+Number(m.qty.replace(/[^0-9]/g,'')),0)
                                const totalAdj   = trail.filter(m=>m.type==='adjustment').length
                                const handlers   = [...new Set(trail.map(m=>m.by))]
                                return (
                                  <div className="mt-4 p-3 rounded border" style={{ fontSize:12 }}>
                                    <div className="fw-medium mb-2 text-muted">MOVEMENT SUMMARY</div>
                                    <div className="d-flex justify-content-between mb-1"><span className="text-muted">Total Received</span><span className="text-success fw-medium">+{totalIn} {r.unit}</span></div>
                                    <div className="d-flex justify-content-between mb-1"><span className="text-muted">Sold / Dispatched</span><span className="fw-medium">−{totalSold} {r.unit}</span></div>
                                    <div className="d-flex justify-content-between mb-1"><span className="text-muted">Adjustments</span><span>{totalAdj} event{totalAdj !== 1 ? 's' : ''}</span></div>
                                    <div className="d-flex justify-content-between mb-1"><span className="text-muted">Movement Steps</span><span>{trail.length}</span></div>
                                    <div className="d-flex justify-content-between pt-2 mt-2 border-top"><span className="text-muted">Handled By</span><span style={{ maxWidth:180, textAlign:'right' }}>{handlers.join(', ')}</span></div>
                                  </div>
                                )
                              })()}
                            </>
                          )}

                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button className="btn btn-light" onClick={closeModal}>Close</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show" style={{ zIndex:1054 }} onClick={closeModal}></div>
          </>
        )
      })()}

      {/* ── REPORT FORM MODAL ─────────────────────────────── */}
      {activeModal === 'form' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h6 className="modal-title">{editItem ? 'Edit Loss Report' : 'Report Lost / Damaged Item'}</h6>
                  <button className="btn-close" onClick={closeModal}></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={saveForm}>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Reference No</label>
                        <input className="form-control bg-light" readOnly value={form.ref} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Date <span className="text-danger">*</span></label>
                        <input type="date" className="form-control" required value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Reported By</label>
                        <select className="form-select" value={form.reportedBy} onChange={e => setForm(f=>({...f,reportedBy:e.target.value}))}>
                          {STAFF.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">Product <span className="text-danger">*</span></label>
                        <select className="form-select" required value={form.product} onChange={e => setForm(f=>({...f,product:e.target.value}))}>
                          {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-medium">Qty Lost</label>
                        <input type="number" className="form-control" min="1" value={form.qty} onChange={e => setForm(f=>({...f,qty:Number(e.target.value)}))} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-medium">Unit</label>
                        <select className="form-select" value={form.unit} onChange={e => setForm(f=>({...f,unit:e.target.value}))}>
                          {['kg','g','litre','pack','piece','bunch','bag','crate','tuber','bottle'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Unit Cost (₦)</label>
                        <input type="number" className="form-control" min="0" value={form.unitCost} onChange={e => setForm(f=>({...f,unitCost:Number(e.target.value)}))} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Total Loss Value</label>
                        <input className="form-control bg-light fw-bold text-danger" readOnly value={`₦${computedTotal.toLocaleString()}`} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-medium">Warehouse</label>
                        <select className="form-select" value={form.warehouse} onChange={e => setForm(f=>({...f,warehouse:e.target.value}))}>
                          {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">Reason <span className="text-danger">*</span></label>
                        <select className="form-select" required value={form.reason} onChange={e => setForm(f=>({...f,reason:e.target.value}))}>
                          {REASONS.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="p-3 rounded mt-3" style={{ background:'#f0f9ff', border:'1px solid #bae6fd', fontSize:13 }}>
                      <i className="ri-information-line text-info me-1"></i>
                      After submitting, open <strong>Investigate</strong> to assign an investigator, document findings, and view the goods movement trail.
                    </div>
                    <div className="d-flex gap-2 mt-4">
                      <button type="button" className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                      <button type="submit" className="btn btn-danger w-100">{editItem ? 'Save Changes' : 'Submit Report'}</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex:1054 }} onClick={closeModal}></div>
        </>
      )}

      {/* ── DELETE MODAL ─────────────────────────────────── */}
      {activeModal === 'delete' && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
            <div className="modal-dialog modal-dialog-centered modal-sm">
              <div className="modal-content p-4 text-center">
                <div className="d-flex justify-content-center mb-3">
                  <div className="rounded-circle bg-danger-subtle d-flex align-items-center justify-content-center" style={{ width:56, height:56 }}>
                    <i className="ri-delete-bin-line text-danger fs-22"></i>
                  </div>
                </div>
                <h6 className="mb-1">Delete Report?</h6>
                <p className="text-muted mb-4" style={{ fontSize:13 }}>{editItem?.ref} — {editItem?.product}</p>
                <div className="d-flex gap-2">
                  <button className="btn btn-light w-100" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-danger w-100" onClick={confirmDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex:1054 }} onClick={closeModal}></div>
        </>
      )}
    </div>
  )
}
