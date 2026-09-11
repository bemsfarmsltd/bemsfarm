import { useState, useMemo } from 'react'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  assigned:           { label: 'Awaiting Pickup',   color: '#06b6d4', bg: '#cffafe', icon: 'ri-user-location-line'   },
  shipped:            { label: 'En Route',           color: '#3b82f6', bg: '#dbeafe', icon: 'ri-truck-line'           },
  delivery_attempted: { label: 'Delivery Attempted', color: '#f97316', bg: '#ffedd5', icon: 'ri-route-line'           },
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const DRIVERS_ALL = [
  { id: 1, name: 'Tunde Adeyemi', phone: '08031234567', bike: 'LAG-234-AB', zone: 'Ikeja / GRA',        active: true  },
  { id: 2, name: 'Emeka Okafor',  phone: '08045678901', bike: 'LAG-567-CD', zone: 'Victoria Island',    active: true  },
  { id: 3, name: 'Bola Akinwale', phone: '08056789012', bike: 'LAG-890-EF', zone: 'Surulere / Yaba',    active: true  },
  { id: 4, name: 'Chidi Eze',     phone: '08067890123', bike: 'LAG-123-GH', zone: 'Lekki Phase 1',      active: false },
  { id: 5, name: 'Femi Adeleye',  phone: '08078901234', bike: 'LAG-456-IJ', zone: 'Maryland / Gbagada', active: true  },
]

const ACTIVE_DELIVERIES_INIT = [
  {
    id: 'DEL-2026-0042',
    orderId: 'ORD-2026-0138',
    status: 'shipped',
    driver: DRIVERS_ALL[1],
    customer: { name: 'Kemi Balogun', phone: '08167891234', address: '18 Surulere, Lagos' },
    items: [{ name: 'Fresh Tomatoes', qty: '3 kg' }, { name: 'Red Bell Pepper', qty: '2 kg' }],
    total: 16100,
    dispatchTime: '15:45',
    eta: '~18 min',
    zone: 'Surulere / Yaba',
    attempts: 0,
    notes: '',
  },
  {
    id: 'DEL-2026-0041',
    orderId: 'ORD-2026-0139',
    status: 'assigned',
    driver: DRIVERS_ALL[0],
    customer: { name: 'Seun Adesanya', phone: '09012341234', address: '5 Victoria Island, Lagos' },
    items: [{ name: 'Ginger', qty: '1 kg' }, { name: 'Garlic', qty: '1 kg' }, { name: 'Sweet Corn', qty: '6 cobs' }],
    total: 14200,
    dispatchTime: '17:20',
    eta: '—',
    zone: 'Ikeja / GRA',
    attempts: 0,
    notes: 'Driver notified. Awaiting pickup confirmation.',
  },
  {
    id: 'DEL-2026-0040',
    orderId: 'ORD-2026-0137',
    status: 'delivery_attempted',
    driver: DRIVERS_ALL[2],
    customer: { name: 'Tobi Adekunle', phone: '07056781234', address: '3 Ojota Estate, Lagos' },
    items: [{ name: 'Plantain', qty: '4 hands' }, { name: 'Ugwu', qty: '3 bunches' }],
    total: 12400,
    dispatchTime: '12:40',
    eta: '—',
    zone: 'Surulere / Yaba',
    attempts: 1,
    notes: 'Customer did not respond. 15-min timer expired. Attempt 1/2.',
  },
  {
    id: 'DEL-2026-0039',
    orderId: 'ORD-2026-0141',
    status: 'assigned',
    driver: DRIVERS_ALL[4],
    customer: { name: 'Adaeze Nwosu', phone: '07098765432', address: '7 Lekki Phase 1, Lagos' },
    items: [{ name: 'Fresh Tomatoes', qty: '8 kg' }, { name: 'Red Bell Pepper', qty: '4 kg' }, { name: '+ 2 more', qty: '' }],
    total: 48100,
    dispatchTime: '—',
    eta: '—',
    zone: 'Maryland / Gbagada',
    attempts: 0,
    notes: 'Order packed. Driver assigned. Awaiting pickup.',
  },
]

const fmt = (n) => `₦${Number(n).toLocaleString()}`

// ─── Auto Assignment Log ──────────────────────────────────────────────────────
// Records every time the system matched an order to a driver automatically
// (zone match + availability). Manager can review and override.

const AUTO_ASSIGN_LOG = [
  {
    id: 'AA-2026-0018', orderId: 'ORD-2026-0138', time: '2026-06-26 15:10',
    customer: 'Kemi Balogun', zone: 'Surulere / Yaba',
    driver: { name: 'Emeka Okafor', bike: 'LAG-567-CD' },
    rule: 'Zone match (Surulere/Yaba) · Driver available · 0 active orders',
    confidence: 'High', overriddenBy: null, status: 'active',
  },
  {
    id: 'AA-2026-0017', orderId: 'ORD-2026-0139', time: '2026-06-26 17:20',
    customer: 'Seun Adesanya', zone: 'Ikeja / GRA',
    driver: { name: 'Tunde Adeyemi', bike: 'LAG-234-AB' },
    rule: 'Zone match (Ikeja/GRA) · Driver available · 1 active order',
    confidence: 'High', overriddenBy: null, status: 'active',
  },
  {
    id: 'AA-2026-0016', orderId: 'ORD-2026-0137', time: '2026-06-26 12:05',
    customer: 'Tobi Adekunle', zone: 'Surulere / Yaba',
    driver: { name: 'Bola Akinwale', bike: 'LAG-890-EF' },
    rule: 'Zone match (Surulere/Yaba) · Driver available · 0 active orders',
    confidence: 'High', overriddenBy: null, status: 'active',
  },
  {
    id: 'AA-2026-0015', orderId: 'ORD-2026-0136', time: '2026-06-26 10:00',
    customer: 'Funmi Ogundele', zone: 'Maryland / Gbagada',
    driver: { name: 'Tunde Adeyemi', bike: 'LAG-234-AB' },
    rule: 'Zone match (Maryland/Gbagada) · Nearest available driver',
    confidence: 'Medium', overriddenBy: null, status: 'delivered',
  },
  {
    id: 'AA-2026-0014', orderId: 'ORD-2026-0135', time: '2026-06-25 16:30',
    customer: 'Chukwuemeka Nze', zone: 'Isolo / Oshodi',
    driver: { name: 'Femi Adeleye', bike: 'LAG-456-IJ' },
    rule: 'Zone match (Isolo/Oshodi) · Driver available · 0 active orders',
    confidence: 'High', overriddenBy: null, status: 'dispute',
  },
  {
    id: 'AA-2026-0013', orderId: 'ORD-2026-0134', time: '2026-06-25 12:00',
    customer: 'Hauwa Musa', zone: 'Surulere / Yaba',
    driver: { name: 'Bola Akinwale', bike: 'LAG-890-EF' },
    rule: 'Zone match (Surulere/Yaba) · Driver available',
    confidence: 'High', overriddenBy: null, status: 'cancelled',
  },
  {
    id: 'AA-2026-0012', orderId: 'ORD-2026-0132', time: '2026-06-24 18:45',
    customer: 'Yetunde Adeniyi', zone: 'Victoria Island',
    driver: { name: 'Emeka Okafor', bike: 'LAG-567-CD' },
    rule: 'Zone match (Victoria Island) · Driver available · 0 active orders',
    confidence: 'High', overriddenBy: null, status: 'delivered',
  },
  {
    id: 'AA-2026-0011', orderId: 'ORD-2026-0131', time: '2026-06-24 15:05',
    customer: 'Rasheedat Lawal', zone: 'Maryland / Gbagada',
    driver: { name: 'Femi Adeleye', bike: 'LAG-456-IJ' },
    rule: 'Zone match (Maryland/Gbagada) · Driver available',
    confidence: 'High',
    overriddenBy: null, status: 'delivered',
  },
  {
    id: 'AA-2026-0010', orderId: 'ORD-2026-0129', time: '2026-06-24 11:00',
    customer: 'Chidi Okonkwo', zone: 'Lekki Phase 2',
    driver: { name: 'Emeka Okafor', bike: 'LAG-567-CD' },
    rule: 'No exact zone match · Nearest driver selected (Lekki Ph.1 → Ph.2)',
    confidence: 'Low',
    overriddenBy: 'Admin (Manual Reassign) → Bola Akinwale', status: 'delivered',
  },
]

const CONFIDENCE_CFG = {
  High:   { color: '#22c55e', bg: '#dcfce7' },
  Medium: { color: '#f59e0b', bg: '#fef3c7' },
  Low:    { color: '#ef4444', bg: '#fee2e2' },
}

const LOG_STATUS_CFG = {
  active:    { label: 'In Progress', color: '#3b82f6', bg: '#dbeafe' },
  delivered: { label: 'Delivered',   color: '#22c55e', bg: '#dcfce7' },
  cancelled: { label: 'Cancelled',   color: '#6b7280', bg: '#f3f4f6' },
  dispute:   { label: 'Dispute',     color: '#ef4444', bg: '#fee2e2' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActiveDeliveries() {
  const [deliveries, setDeliveries] = useState(ACTIVE_DELIVERIES_INIT)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch]             = useState('')
  const [activeModal, setActiveModal]   = useState(null)
  const [selected, setSelected]         = useState(null)
  const [reassignDriverId, setReassignDriverId] = useState('')
  const [attemptNote, setAttemptNote]   = useState('')
  const [activeTab, setActiveTab]       = useState('live') // 'live' | 'auto_log'
  const [retryNote, setRetryNote]       = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [cancelStep, setCancelStep]     = useState(1) // 1=reason, 2=return-goods, 3=done

  const openModal  = (type, del) => {
    setSelected(del); setActiveModal(type)
    setReassignDriverId(''); setAttemptNote(''); setRetryNote(''); setCancelReason(''); setCancelStep(1)
  }
  const closeModal = () => { setActiveModal(null); setSelected(null) }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     deliveries.length,
    enRoute:   deliveries.filter(d => d.status === 'shipped').length,
    awaiting:  deliveries.filter(d => d.status === 'assigned').length,
    attempted: deliveries.filter(d => d.status === 'delivery_attempted').length,
  }), [deliveries])

  // ── Filtered ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return deliveries.filter(d => {
      const okStatus = filterStatus === 'all' || d.status === filterStatus
      const okSearch = !q || d.id.toLowerCase().includes(q) || d.orderId.toLowerCase().includes(q)
        || d.customer.name.toLowerCase().includes(q) || d.driver.name.toLowerCase().includes(q)
      return okStatus && okSearch
    })
  }, [deliveries, filterStatus, search])

  // ── Actions ────────────────────────────────────────────────────────────────
  const reassignDriver = () => {
    if (!reassignDriverId) return
    const driver = DRIVERS_ALL.find(d => d.id === Number(reassignDriverId))
    setDeliveries(prev => prev.map(d =>
      d.id !== selected.id ? d : { ...d, driver, notes: `Driver reassigned to: ${driver.name}` }
    ))
    closeModal()
  }

  const markAttempted = () => {
    setDeliveries(prev => prev.map(d =>
      d.id !== selected.id ? d : {
        ...d, status: 'delivery_attempted',
        attempts: d.attempts + 1,
        notes: attemptNote || 'Customer unavailable. 15-min timer expired.',
      }
    ))
    closeModal()
  }

  const markDelivered = () => {
    setDeliveries(prev => prev.filter(d => d.id !== selected.id))
    closeModal()
  }

  const scheduleRetry = () => {
    setDeliveries(prev => prev.map(d =>
      d.id !== selected.id ? d : {
        ...d, status: 'assigned',
        notes: retryNote || 'New delivery attempt scheduled by Admin. Driver notified.',
      }
    ))
    closeModal()
  }

  const cancelAndReturnStock = () => {
    // Remove from active deliveries — order is now cancelled/returned
    setDeliveries(prev => prev.filter(d => d.id !== selected.id))
    closeModal()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="container-fluid">

      {/* Page Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Active Deliveries</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Deliveries</a></li>
          <li className="breadcrumb-item active">Active Deliveries</li>
        </ul>
      </div>

      {/* Page Tabs */}
      <div className="card mb-4">
        <div className="card-body d-flex gap-1 p-2">
          <button className={`btn btn-sm ${activeTab === 'live' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab('live')}>
            <i className="ri-truck-line me-1" />Live Deliveries
            <span className="badge rounded-pill ms-2" style={{ background: activeTab === 'live' ? 'rgba(255,255,255,0.3)' : '#e5e7eb', color: activeTab === 'live' ? '#fff' : '#374151' }}>
              {deliveries.length}
            </span>
          </button>
          <button className={`btn btn-sm ${activeTab === 'auto_log' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab('auto_log')}>
            <i className="ri-cpu-line me-1" />Auto Assignment Log
            <span className="badge rounded-pill ms-2" style={{ background: activeTab === 'auto_log' ? 'rgba(255,255,255,0.3)' : '#e5e7eb', color: activeTab === 'auto_log' ? '#fff' : '#374151' }}>
              {AUTO_ASSIGN_LOG.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── AUTO ASSIGNMENT LOG ───────────────────────────────────────────────── */}
      {activeTab === 'auto_log' && (
        <div>
          <div className="alert alert-info small mb-3 d-flex gap-2 align-items-start">
            <i className="ri-cpu-line mt-1 flex-shrink-0" />
            <div>
              <strong>System Auto Assignment</strong> — When an order is packed and ready, Bems Admin automatically matches
              it to the best available driver based on zone, current load, and availability.
              Managers can review every auto-assignment here and override with a manual reassignment from the Orders page.
            </div>
          </div>

          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Log ID</th>
                    <th>Time</th>
                    <th>Order / Customer</th>
                    <th>Zone</th>
                    <th>Auto-Assigned Driver</th>
                    <th>Matching Rule</th>
                    <th>Confidence</th>
                    <th>Override?</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {AUTO_ASSIGN_LOG.map(log => {
                    const confCfg   = CONFIDENCE_CFG[log.confidence]
                    const statusCfg = LOG_STATUS_CFG[log.status]
                    return (
                      <tr key={log.id}>
                        <td>
                          <div className="fw-medium small">{log.id}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: 12 }}>{log.time.split(' ')[0]}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{log.time.split(' ')[1]}</div>
                        </td>
                        <td>
                          <div className="fw-medium small text-primary">{log.orderId}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{log.customer}</div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <i className="ri-map-pin-line text-muted" style={{ fontSize: 12 }} />
                            <span style={{ fontSize: 12 }}>{log.zone}</span>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="rounded-circle d-flex align-items-center justify-content-center bg-primary text-white flex-shrink-0"
                              style={{ width: 28, height: 28, fontSize: 9, fontWeight: 700 }}>
                              {log.driver.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="fw-medium" style={{ fontSize: 12 }}>{log.driver.name}</div>
                              <div className="text-muted" style={{ fontSize: 10 }}>{log.driver.bike}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="text-muted" style={{ fontSize: 11, maxWidth: 200 }}>{log.rule}</div>
                        </td>
                        <td>
                          <span className="badge" style={{ background: confCfg.bg, color: confCfg.color, fontSize: 10 }}>
                            {log.confidence}
                          </span>
                        </td>
                        <td>
                          {log.overriddenBy
                            ? <div>
                                <span className="badge" style={{ background: '#fef3c7', color: '#d97706', fontSize: 10 }}>
                                  <i className="ri-edit-line me-1" />Overridden
                                </span>
                                <div className="text-muted" style={{ fontSize: 10, marginTop: 2 }}>{log.overriddenBy}</div>
                              </div>
                            : <span className="badge" style={{ background: '#dcfce7', color: '#16a34a', fontSize: 10 }}>
                                <i className="ri-checkbox-circle-line me-1" />No override
                              </span>
                          }
                        </td>
                        <td>
                          <span className="badge" style={{ background: statusCfg.bg, color: statusCfg.color, fontSize: 10 }}>
                            {statusCfg.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE DELIVERIES ───────────────────────────────────────────────────── */}
      {activeTab === 'live' && (<>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Active',       value: stats.total,     color: '#6366f1', icon: 'ri-route-line',           filter: 'all'               },
          { label: 'En Route',           value: stats.enRoute,   color: '#3b82f6', icon: 'ri-truck-line',           filter: 'shipped'           },
          { label: 'Awaiting Pickup',    value: stats.awaiting,  color: '#06b6d4', icon: 'ri-user-location-line',   filter: 'assigned'          },
          { label: 'Delivery Attempted', value: stats.attempted, color: '#f97316', icon: 'ri-error-warning-line',   filter: 'delivery_attempted'},
        ].map(c => (
          <div key={c.label} className="col-6 col-md-3">
            <div className="card p-3" style={{ borderLeft: `3px solid ${c.color}`, cursor: 'pointer' }}
              onClick={() => setFilterStatus(c.filter)}>
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 40, height: 40, background: c.color + '20' }}>
                  <i className={`${c.icon} fs-18`} style={{ color: c.color }} />
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{c.label}</div>
                  <div className="fw-bold fs-24">{c.value}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <div className="input-group" style={{ maxWidth: 280 }}>
            <span className="input-group-text"><i className="ri-search-line" /></span>
            <input className="form-control" placeholder="Delivery ID, order, customer, driver..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {filterStatus !== 'all' && (
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setFilterStatus('all')}>
              <i className="ri-close-line me-1" />Clear Filter
            </button>
          )}
          <div className="ms-auto">
            <span className="badge rounded-pill bg-success me-1" style={{ fontSize: 11 }}>
              <i className="ri-checkbox-blank-circle-fill me-1" style={{ fontSize: 8 }} />Live
            </span>
            <span className="text-muted small">{filtered.length} active</span>
          </div>
        </div>
        {/* Status tabs */}
        <div className="border-top px-3" style={{ overflowX: 'auto' }}>
          <div className="d-flex" style={{ whiteSpace: 'nowrap' }}>
            {[{ key: 'all', label: 'All Active' }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ key: k, label: v.label }))].map(t => (
              <button key={t.key} className="btn btn-sm border-0 rounded-0 py-2 px-3"
                style={{
                  borderBottom: filterStatus === t.key ? '2px solid #6366f1' : '2px solid transparent',
                  color: filterStatus === t.key ? '#6366f1' : '#6b7280',
                  fontWeight: filterStatus === t.key ? 600 : 400,
                  background: 'transparent',
                }}
                onClick={() => setFilterStatus(t.key)}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Delivery Cards Grid */}
      {filtered.length === 0 && (
        <div className="card p-5 text-center text-muted">
          <i className="ri-truck-line fs-1 mb-2" />
          <div>No active deliveries</div>
        </div>
      )}

      <div className="row g-3">
        {filtered.map(del => {
          const cfg = STATUS_CFG[del.status]
          return (
            <div key={del.id} className="col-md-6 col-xl-4">
              <div className="card h-100" style={{ borderTop: `3px solid ${cfg.color}` }}>
                <div className="card-body d-flex flex-column gap-3">

                  {/* Top Row — IDs + Status */}
                  <div className="d-flex align-items-start justify-content-between">
                    <div>
                      <div className="fw-bold" style={{ fontSize: 13 }}>{del.id}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        <i className="ri-link me-1" />{del.orderId}
                      </div>
                    </div>
                    <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: 11 }}>
                      <i className={`${cfg.icon} me-1`} />{cfg.label}
                    </span>
                  </div>

                  {/* Customer */}
                  <div className="d-flex gap-2 align-items-start">
                    <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white flex-shrink-0"
                      style={{ width: 32, height: 32, fontSize: 11 }}>
                      {del.customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-fill">
                      <div className="fw-medium" style={{ fontSize: 13 }}>{del.customer.name}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{del.customer.phone}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        <i className="ri-map-pin-line me-1" />{del.customer.address}
                      </div>
                    </div>
                    <a href={`tel:${del.customer.phone}`}
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }}
                      title={`Call ${del.customer.name}`}>
                      <i className="ri-phone-line" style={{ fontSize: 13 }}/>
                    </a>
                  </div>

                  {/* Items preview */}
                  <div className="border rounded p-2" style={{ background: '#f8fafc', fontSize: 12 }}>
                    {del.items.map((item, i) => (
                      <div key={i} className="d-flex justify-content-between">
                        <span>{item.name}</span>
                        <span className="text-muted">{item.qty}</span>
                      </div>
                    ))}
                    <div className="border-top mt-1 pt-1 fw-bold d-flex justify-content-between">
                      <span>Order Total</span><span>{fmt(del.total)}</span>
                    </div>
                  </div>

                  {/* Driver */}
                  <div className="d-flex align-items-center gap-2 p-2 border rounded"
                    style={{ background: cfg.bg + '40' }}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 32, height: 32, background: cfg.color, color: '#fff', fontSize: 11 }}>
                      {del.driver.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-medium" style={{ fontSize: 12 }}>{del.driver.name}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{del.driver.phone} · {del.driver.bike}</div>
                    </div>
                    <a href={`tel:${del.driver.phone}`} className="btn btn-sm btn-outline-secondary" title="Call Driver">
                      <i className="ri-phone-line" />
                    </a>
                  </div>

                  {/* ETA + Dispatch */}
                  <div className="d-flex gap-2">
                    <div className="flex-fill border rounded p-2 text-center" style={{ fontSize: 12 }}>
                      <div className="text-muted" style={{ fontSize: 10 }}>DISPATCHED</div>
                      <div className="fw-medium">{del.dispatchTime}</div>
                    </div>
                    <div className="flex-fill border rounded p-2 text-center" style={{ fontSize: 12 }}>
                      <div className="text-muted" style={{ fontSize: 10 }}>ETA</div>
                      <div className="fw-medium" style={{ color: cfg.color }}>{del.eta}</div>
                    </div>
                    {del.attempts > 0 && (
                      <div className="flex-fill border rounded p-2 text-center" style={{ fontSize: 12, borderColor: '#f97316 !important' }}>
                        <div className="text-muted" style={{ fontSize: 10 }}>ATTEMPTS</div>
                        <div className="fw-bold text-danger">{del.attempts}/2</div>
                      </div>
                    )}
                  </div>

                  {/* Admin Action Required banner — delivery_attempted */}
                  {del.status === 'delivery_attempted' && (
                    <div className="rounded p-2" style={{ background:'#fff7ed', borderLeft:'3px solid #f97316' }}>
                      <div className="fw-medium small text-danger d-flex align-items-center gap-1 mb-1">
                        <i className="ri-alarm-warning-line" />
                        {del.attempts >= 2
                          ? '⚠️ FINAL ATTEMPT — Cancel order mandatory'
                          : '⚠️ Admin Action Required'}
                      </div>
                      <div style={{ fontSize:11, color:'#92400e' }}>
                        Driver tapped CUSTOMER UNAVAILABLE. Push + SMS sent. 15-min timer expired.
                        Attempt <strong>{del.attempts}</strong> of 2.
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {del.notes && del.status !== 'delivery_attempted' && (
                    <div className="small text-muted border-start border-warning ps-2">
                      {del.notes}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="d-flex gap-2 mt-auto flex-wrap">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => openModal('view', del)}>
                      <i className="ri-eye-line me-1" />Details
                    </button>

                    {/* En Route actions */}
                    {del.status === 'shipped' && (
                      <button className="btn btn-sm btn-outline-warning flex-fill" onClick={() => openModal('attempted', del)}>
                        <i className="ri-route-line me-1" />Mark Attempted
                      </button>
                    )}
                    {del.status === 'shipped' && (
                      <button className="btn btn-sm btn-success flex-fill" onClick={() => openModal('delivered', del)}>
                        <i className="ri-checkbox-circle-line me-1" />Delivered
                      </button>
                    )}

                    {/* Awaiting pickup — reassign only */}
                    {del.status === 'assigned' && (
                      <button className="btn btn-sm btn-outline-primary flex-fill" onClick={() => openModal('reassign', del)}>
                        <i className="ri-user-follow-line me-1" />Reassign Driver
                      </button>
                    )}

                    {/* Delivery attempted — Schedule Retry or Cancel */}
                    {del.status === 'delivery_attempted' && del.attempts < 2 && (
                      <button className="btn btn-sm btn-warning flex-fill" onClick={() => openModal('scheduleRetry', del)}>
                        <i className="ri-refresh-line me-1" />Schedule Retry
                      </button>
                    )}
                    {del.status === 'delivery_attempted' && (
                      <button className="btn btn-sm btn-danger flex-fill" onClick={() => openModal('cancelReturn', del)}>
                        <i className="ri-close-circle-line me-1" />
                        {del.attempts >= 2 ? 'Cancel Order (Mandatory)' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      </>)} {/* end activeTab === 'live' */}

      {/* ════════════════════════════════════════════════
          MODALS (shared across both tabs)
      ════════════════════════════════════════════════ */}

      {activeModal && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && closeModal()}>

          {/* ── VIEW DETAILS ──────────────────────────── */}
          {activeModal === 'view' && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <div>
                  <h5 className="mb-0">{selected.id}</h5>
                  <div className="text-muted small">{selected.orderId}</div>
                </div>
                <div className="d-flex gap-2 align-items-center">
                  {(() => { const c = STATUS_CFG[selected.status]; return (
                    <span className="badge" style={{ background: c.bg, color: c.color }}>
                      <i className={`${c.icon} me-1`} />{c.label}
                    </span>
                  )})()}
                  <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
                </div>
              </div>
              <div className="p-4 d-flex flex-column gap-3">
                {/* Customer */}
                <div>
                  <div className="text-muted small mb-1 fw-medium">Customer</div>
                  <div className="fw-medium">{selected.customer.name}</div>
                  <div className="small">{selected.customer.phone}</div>
                  <div className="small text-muted"><i className="ri-map-pin-line me-1" />{selected.customer.address}</div>
                </div>
                {/* Driver */}
                <div>
                  <div className="text-muted small mb-1 fw-medium">Driver</div>
                  <div className="d-flex align-items-center gap-2 p-2 border rounded">
                    <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white flex-shrink-0"
                      style={{ width: 36, height: 36, fontSize: 12 }}>
                      {selected.driver.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-medium">{selected.driver.name}</div>
                      <div className="small text-muted">{selected.driver.phone} · {selected.driver.bike}</div>
                      <div className="small text-muted">{selected.driver.zone}</div>
                    </div>
                    <a href={`tel:${selected.driver.phone}`} className="btn btn-sm btn-success">
                      <i className="ri-phone-line me-1" />Call
                    </a>
                  </div>
                </div>
                {/* Items */}
                <div>
                  <div className="text-muted small mb-1 fw-medium">Items</div>
                  <div className="border rounded p-2" style={{ fontSize: 13 }}>
                    {selected.items.map((item, i) => (
                      <div key={i} className="d-flex justify-content-between py-1 border-bottom">
                        <span>{item.name}</span><span className="text-muted">{item.qty}</span>
                      </div>
                    ))}
                    <div className="d-flex justify-content-between pt-1 fw-bold">
                      <span>Total</span><span>{fmt(selected.total)}</span>
                    </div>
                  </div>
                </div>
                {/* Meta */}
                <div className="row g-2">
                  <div className="col-6">
                    <div className="border rounded p-2 text-center">
                      <div className="text-muted" style={{ fontSize: 10 }}>ZONE</div>
                      <div className="fw-medium small">{selected.zone}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="border rounded p-2 text-center">
                      <div className="text-muted" style={{ fontSize: 10 }}>DISPATCHED</div>
                      <div className="fw-medium small">{selected.dispatchTime}</div>
                    </div>
                  </div>
                  {selected.attempts > 0 && (
                    <div className="col-12">
                      <div className="alert alert-warning p-2 mb-0 small">
                        <i className="ri-error-warning-line me-1" />
                        {selected.attempts} delivery attempt(s). Max 2 allowed.
                      </div>
                    </div>
                  )}
                </div>
                {selected.notes && (
                  <div className="small text-muted border-start border-warning ps-2">{selected.notes}</div>
                )}
                <div className="d-flex gap-2 pt-2 border-top">
                  <button className="btn btn-outline-primary flex-fill" onClick={() => { closeModal(); setTimeout(() => openModal('reassign', selected), 100) }}>
                    <i className="ri-user-add-line me-1" />Reassign Driver
                  </button>
                  <button className="btn btn-outline-secondary" onClick={closeModal}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* ── REASSIGN DRIVER ───────────────────────── */}
          {activeModal === 'reassign' && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 460 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0">Reassign Driver</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div className="p-4">
                <div className="small text-muted mb-3 p-2 border rounded bg-light">
                  <strong>{selected.id}</strong> · {selected.customer.name} · {selected.customer.address}
                </div>
                <div className="mb-2 small text-muted">Current driver: <strong>{selected.driver.name}</strong></div>
                <label className="form-label fw-medium small">Select Replacement Driver</label>
                {DRIVERS_ALL.filter(d => d.active && d.id !== selected.driver.id).map(driver => (
                  <div key={driver.id}
                    className="d-flex align-items-center gap-3 p-3 border rounded mb-2"
                    style={{ cursor: 'pointer',
                      background: Number(reassignDriverId) === driver.id ? '#ede9fe' : '#fff',
                      borderColor: Number(reassignDriverId) === driver.id ? '#8b5cf6' : '#dee2e6' }}
                    onClick={() => setReassignDriverId(String(driver.id))}>
                    <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white flex-shrink-0"
                      style={{ width: 36, height: 36, fontSize: 11 }}>
                      {driver.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-medium small">{driver.name}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{driver.phone} · {driver.zone}</div>
                    </div>
                    {Number(reassignDriverId) === driver.id && <i className="ri-checkbox-circle-fill text-primary fs-18" />}
                  </div>
                ))}
                <div className="d-flex gap-2 mt-3">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-primary flex-fill" onClick={reassignDriver} disabled={!reassignDriverId}>
                    <i className="ri-user-add-line me-1" />Reassign & Notify
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── DELIVERY ATTEMPTED ────────────────────── */}
          {activeModal === 'attempted' && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 440 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0">Mark Delivery Attempted</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div className="p-4">
                <div className="alert alert-warning mb-3 small">
                  <i className="ri-route-line me-1" />
                  Customer did not respond or was unavailable. This was attempt <strong>{selected.attempts + 1}</strong> of 2.
                  {selected.attempts >= 1 && <><br/><strong className="text-danger">This is the final attempt. If failed again, the order must be cancelled.</strong></>}
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium small">Notes</label>
                  <textarea className="form-control" rows={3}
                    placeholder="e.g. No response after knocking and calling twice. 15-min timer expired."
                    value={attemptNote} onChange={e => setAttemptNote(e.target.value)} />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-warning flex-fill" onClick={markAttempted}>
                    <i className="ri-route-line me-1" />Confirm Attempted
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CONFIRM DELIVERED ─────────────────────── */}
          {activeModal === 'delivered' && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0">Confirm Delivery</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div className="p-4">
                <div className="alert alert-success mb-3 small">
                  <i className="ri-checkbox-circle-line me-1" />
                  Confirming that <strong>{selected.customer.name}</strong>'s order has been successfully delivered by <strong>{selected.driver.name}</strong>.
                  This order will be marked as <strong>Delivered</strong> and removed from active deliveries.
                </div>
                <div className="small text-muted mb-3">
                  Note: Customer must have confirmed delivery on the app, and driver must have confirmed on the Driver App for this to be valid.
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-success flex-fill" onClick={markDelivered}>
                    <i className="ri-checkbox-circle-line me-1" />Mark as Delivered
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SCHEDULE RETRY ────────────────────────── */}
          {activeModal === 'scheduleRetry' && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:500 }}>
              {/* Dark header */}
              <div style={{ background:'#1e293b', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-bold fs-15">
                      <i className="ri-refresh-line me-2 text-warning"/>Schedule New Delivery Attempt
                    </div>
                    <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>{selected.orderId} · {selected.customer.name}</div>
                  </div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>

              <div className="p-4">
                {/* What happened */}
                <div className="border rounded p-3 mb-4" style={{ background:'#fffbeb', fontSize:12 }}>
                  <div className="fw-medium small mb-2" style={{ color:'#92400e' }}>What happened (Attempt {selected.attempts} of 2):</div>
                  {[
                    { icon:'ri-truck-line',         text:`${selected.driver.name} arrived at delivery location` },
                    { icon:'ri-tap-line',            text:'Driver tapped CUSTOMER UNAVAILABLE on Driver App' },
                    { icon:'ri-notification-3-line', text:'System sent push notification + SMS to customer' },
                    { icon:'ri-timer-line',          text:'15-minute timer expired — customer did not respond' },
                  ].map((s, i) => (
                    <div key={i} className="d-flex align-items-center gap-2 py-1">
                      <i className={`${s.icon} text-warning flex-shrink-0`} style={{ fontSize:12 }}/>
                      <span>{s.text}</span>
                    </div>
                  ))}
                </div>

                {/* Action */}
                <div className="alert alert-info small mb-3">
                  <i className="ri-information-line me-1"/>
                  Scheduling a new attempt will move this delivery back to <strong>Awaiting Pickup</strong>.
                  The driver will be notified to attempt delivery again. <strong>Maximum 2 attempts total.</strong>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-medium small">Re-attempt Notes <span className="text-danger">*</span></label>
                  <textarea className="form-control" rows={3}
                    placeholder="e.g. Customer confirmed available after 5pm. Called on 08167891234. Admin verified."
                    value={retryNote} onChange={e => setRetryNote(e.target.value)}/>
                  <div className="text-muted" style={{ fontSize:11, marginTop:4 }}>
                    This note is added to the order timeline and shown to the driver.
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-warning flex-fill" onClick={scheduleRetry} disabled={!retryNote}>
                    <i className="ri-refresh-line me-1"/>Confirm — Schedule Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CANCEL ORDER & RETURN STOCK ───────────── */}
          {activeModal === 'cancelReturn' && (
            <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:520 }}>
              {/* Dark header */}
              <div style={{ background:'#7f1d1d', borderRadius:'12px 12px 0 0', padding:'18px 24px', color:'#fff' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-bold fs-15">
                      <i className="ri-close-circle-line me-2"/>
                      {selected.attempts >= 2 ? 'Cancel Order — 2 Attempts Exhausted' : 'Cancel Order & Return Goods'}
                    </div>
                    <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>{selected.orderId} · {selected.customer.name}</div>
                  </div>
                  <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line"/></button>
                </div>
              </div>

              <div className="p-4">

                {/* Step 1 — Reason */}
                {cancelStep === 1 && (
                  <>
                    {selected.attempts >= 2 && (
                      <div className="alert alert-danger small mb-3">
                        <i className="ri-alarm-warning-line me-1"/>
                        <strong>Maximum 2 delivery attempts reached.</strong> This order cannot be re-attempted and must be cancelled.
                      </div>
                    )}

                    <div className="border rounded p-3 mb-4" style={{ background:'#f8fafc', fontSize:12 }}>
                      <div className="fw-medium small mb-2 text-muted">This cancellation will trigger:</div>
                      {[
                        { icon:'ri-refund-2-line',       color:'#22c55e', text:'Refund via Paystack to customer' },
                        { icon:'ri-store-2-line',        color:'#3b82f6', text:'Driver instructed to return goods to store' },
                        { icon:'ri-archive-line',        color:'#f59e0b', text:'Admin / Dispatch Manager checks goods in' },
                        { icon:'ri-database-2-line',     color:'#8b5cf6', text:'Stock quantities restored in system' },
                      ].map((s, i) => (
                        <div key={i} className="d-flex align-items-center gap-2 py-1">
                          <i className={`${s.icon} flex-shrink-0`} style={{ color:s.color, fontSize:13 }}/>
                          <span>{s.text}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-medium small">Cancellation Reason <span className="text-danger">*</span></label>
                      <textarea className="form-control" rows={3}
                        placeholder={selected.attempts >= 2
                          ? 'Customer unreachable after 2 delivery attempts. Goods returned to store.'
                          : 'Why is this order being cancelled?'}
                        value={cancelReason} onChange={e => setCancelReason(e.target.value)}/>
                    </div>

                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Go Back</button>
                      <button className="btn btn-danger flex-fill" onClick={() => setCancelStep(2)} disabled={!cancelReason}>
                        <i className="ri-arrow-right-line me-1"/>Next — Return Goods to Store
                      </button>
                    </div>
                  </>
                )}

                {/* Step 2 — Return goods confirmation */}
                {cancelStep === 2 && (
                  <>
                    <div className="text-center mb-4">
                      <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                        style={{ width:56, height:56, background:'#dbeafe' }}>
                        <i className="ri-store-2-fill fs-24" style={{ color:'#3b82f6' }}/>
                      </div>
                      <h5>Instruct Driver to Return Goods</h5>
                      <p className="text-muted small mb-0">
                        Call or message <strong>{selected.driver.name}</strong> ({selected.driver.phone}) and instruct them to bring all goods back to the Bems Farms store immediately.
                      </p>
                    </div>

                    <div className="alert alert-warning small mb-4">
                      <i className="ri-phone-line me-1"/>
                      <strong>Call {selected.driver.name}:</strong> {selected.driver.phone}
                      <br/>Driver is returning goods from: <strong>{selected.customer.address}</strong>
                    </div>

                    {/* Summary of goods */}
                    <div className="border rounded p-3 mb-4" style={{ fontSize:12 }}>
                      <div className="fw-medium small mb-2">Goods to be returned:</div>
                      {selected.items.map((item, i) => (
                        <div key={i} className="d-flex justify-content-between py-1 border-bottom">
                          <span>{item.name}</span>
                          <span className="text-muted">{item.qty}</span>
                        </div>
                      ))}
                    </div>

                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-secondary flex-fill" onClick={() => setCancelStep(1)}>Back</button>
                      <button className="btn btn-primary flex-fill" onClick={() => setCancelStep(3)}>
                        <i className="ri-check-line me-1"/>Driver Contacted — Next
                      </button>
                    </div>
                  </>
                )}

                {/* Step 3 — Stock restoration confirmation */}
                {cancelStep === 3 && (
                  <>
                    <div className="text-center mb-4">
                      <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                        style={{ width:56, height:56, background:'#dcfce7' }}>
                        <i className="ri-database-2-fill fs-24 text-success"/>
                      </div>
                      <h5>Confirm Goods Received & Stock Restored</h5>
                      <p className="text-muted small mb-0">
                        Once the driver returns goods to the store, confirm receipt and stock will be restored.
                      </p>
                    </div>

                    <div className="border rounded p-3 mb-4" style={{ background:'#f0fdf4', fontSize:12 }}>
                      <div className="fw-medium small mb-2 text-success">Checklist before confirming:</div>
                      {[
                        'All goods physically received and counted at store',
                        'Items checked for damage',
                        'Quantities match the original order',
                        'Stock will be incremented back in the system',
                      ].map((item, i) => (
                        <div key={i} className="d-flex align-items-center gap-2 py-1">
                          <i className="ri-checkbox-circle-line text-success flex-shrink-0"/>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-secondary flex-fill" onClick={() => setCancelStep(2)}>Back</button>
                      <button className="btn btn-danger flex-fill" onClick={cancelAndReturnStock}>
                        <i className="ri-close-circle-line me-1"/>Confirm — Cancel Order & Restore Stock
                      </button>
                    </div>
                  </>
                )}

              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
