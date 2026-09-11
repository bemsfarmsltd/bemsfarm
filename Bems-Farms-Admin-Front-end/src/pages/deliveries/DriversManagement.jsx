import { useState, useMemo } from 'react'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  active:    { label: 'Active',    color: '#22c55e', bg: '#dcfce7', icon: 'ri-checkbox-circle-line'  },
  on_delivery:{ label: 'On Delivery', color: '#3b82f6', bg: '#dbeafe', icon: 'ri-truck-line'         },
  off_duty:  { label: 'Off Duty',  color: '#6b7280', bg: '#f3f4f6', icon: 'ri-moon-line'             },
  suspended: { label: 'Suspended', color: '#ef4444', bg: '#fee2e2', icon: 'ri-forbid-line'           },
}

const ZONES = ['Victoria Island', 'Lekki Phase 1', 'Lekki Phase 2', 'Ikeja / GRA', 'Surulere', 'Yaba / Mainland', 'Maryland / Gbagada', 'Ikorodu', 'Isolo / Oshodi']
const VEHICLE_TYPES = ['Motorcycle', 'Bicycle', 'Car', 'Van']

// ─── Mock Data ────────────────────────────────────────────────────────────────

const DRIVERS_INIT = [
  {
    id: 1, name: 'Tunde Adeyemi', phone: '08031234567', email: 'tunde.a@bemsfarms.com',
    bike: 'LAG-234-AB', vehicleType: 'Motorcycle', zone: 'Ikeja / GRA',
    status: 'on_delivery', joinDate: '2025-03-10',
    deliveries: 142, rating: 4.8, successRate: 97, earnings: 284000,
    currentOrder: 'ORD-2026-0139',
    history: [
      { date: '2026-06-27', orders: 3, earnings: 6000 },
      { date: '2026-06-26', orders: 5, earnings: 9500 },
      { date: '2026-06-25', orders: 4, earnings: 8000 },
    ],
    notes: '',
  },
  {
    id: 2, name: 'Emeka Okafor', phone: '08045678901', email: 'emeka.o@bemsfarms.com',
    bike: 'LAG-567-CD', vehicleType: 'Motorcycle', zone: 'Victoria Island',
    status: 'on_delivery', joinDate: '2025-01-15',
    deliveries: 201, rating: 4.9, successRate: 99, earnings: 402000,
    currentOrder: 'ORD-2026-0138',
    history: [
      { date: '2026-06-27', orders: 4, earnings: 7500 },
      { date: '2026-06-26', orders: 6, earnings: 11000 },
      { date: '2026-06-25', orders: 5, earnings: 9000 },
    ],
    notes: '',
  },
  {
    id: 3, name: 'Bola Akinwale', phone: '08056789012', email: 'bola.a@bemsfarms.com',
    bike: 'LAG-890-EF', vehicleType: 'Motorcycle', zone: 'Surulere',
    status: 'on_delivery', joinDate: '2025-05-20',
    deliveries: 88, rating: 4.5, successRate: 94, earnings: 176000,
    currentOrder: 'ORD-2026-0137',
    history: [
      { date: '2026-06-27', orders: 2, earnings: 3500 },
      { date: '2026-06-26', orders: 3, earnings: 6000 },
      { date: '2026-06-25', orders: 4, earnings: 7500 },
    ],
    notes: 'Had 1 failed delivery attempt today.',
  },
  {
    id: 4, name: 'Chidi Eze', phone: '08067890123', email: 'chidi.e@bemsfarms.com',
    bike: 'LAG-123-GH', vehicleType: 'Bicycle', zone: 'Yaba / Mainland',
    status: 'off_duty', joinDate: '2025-07-01',
    deliveries: 56, rating: 4.4, successRate: 92, earnings: 112000,
    currentOrder: null,
    history: [
      { date: '2026-06-26', orders: 2, earnings: 4000 },
      { date: '2026-06-25', orders: 3, earnings: 5500 },
    ],
    notes: '',
  },
  {
    id: 5, name: 'Femi Adeleye', phone: '08078901234', email: 'femi.a@bemsfarms.com',
    bike: 'LAG-456-IJ', vehicleType: 'Motorcycle', zone: 'Maryland / Gbagada',
    status: 'on_delivery', joinDate: '2025-02-28',
    deliveries: 175, rating: 4.7, successRate: 96, earnings: 350000,
    currentOrder: 'ORD-2026-0141',
    history: [
      { date: '2026-06-27', orders: 3, earnings: 6500 },
      { date: '2026-06-26', orders: 5, earnings: 10000 },
      { date: '2026-06-25', orders: 6, earnings: 12000 },
    ],
    notes: '',
  },
  {
    id: 6, name: 'Yemi Oladapo', phone: '08089012345', email: 'yemi.o@bemsfarms.com',
    bike: 'LAG-789-KL', vehicleType: 'Motorcycle', zone: 'Lekki Phase 1',
    status: 'suspended', joinDate: '2025-04-10',
    deliveries: 34, rating: 3.8, successRate: 82, earnings: 68000,
    currentOrder: null,
    history: [
      { date: '2026-06-20', orders: 2, earnings: 4000 },
    ],
    notes: 'Suspended: multiple customer complaints about late deliveries and rude behaviour. Under review.',
  },
]

const BLANK_FORM = {
  name: '', phone: '', email: '', vehicleType: 'Motorcycle', bike: '', zone: ZONES[0], notes: '',
}

const fmt = (n) => `₦${Number(n).toLocaleString()}`

function StarRating({ rating }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <i key={i} className={i <= Math.round(rating) ? 'ri-star-fill text-warning' : 'ri-star-line text-muted'} style={{ fontSize: 12 }} />
      ))}
      <span className="ms-1 small fw-medium">{rating}</span>
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DriversManagement() {
  const [drivers, setDrivers]           = useState(DRIVERS_INIT)
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [selected, setSelected]         = useState(null)
  const [form, setForm]                 = useState(BLANK_FORM)
  const [suspendNote, setSuspendNote]   = useState('')
  const [isEditing, setIsEditing]       = useState(false)

  const openModal = (type, driver = null) => {
    setSelected(driver)
    setActiveModal(type)
    setSuspendNote('')
    if (type === 'add') { setForm(BLANK_FORM); setIsEditing(false) }
    if (type === 'edit' && driver) { setForm({ ...driver }); setIsEditing(true) }
  }
  const closeModal = () => { setActiveModal(null); setSelected(null) }
  const setField   = (f, v) => setForm(p => ({ ...p, [f]: v }))

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:       drivers.length,
    active:      drivers.filter(d => d.status === 'active').length,
    onDelivery:  drivers.filter(d => d.status === 'on_delivery').length,
    offDuty:     drivers.filter(d => d.status === 'off_duty').length,
    suspended:   drivers.filter(d => d.status === 'suspended').length,
    totalDeliveries: drivers.reduce((s, d) => s + d.deliveries, 0),
  }), [drivers])

  // ── Filtered ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return drivers.filter(d => {
      const okStatus = filterStatus === 'all' || d.status === filterStatus
      const okSearch = !q || d.name.toLowerCase().includes(q) || d.phone.includes(q) || d.zone.toLowerCase().includes(q)
      return okStatus && okSearch
    })
  }, [drivers, search, filterStatus])

  // ── Actions ────────────────────────────────────────────────────────────────
  const saveDriver = () => {
    if (!form.name || !form.phone) return
    if (isEditing) {
      setDrivers(prev => prev.map(d => d.id !== selected.id ? d : { ...d, ...form }))
    } else {
      const newDriver = {
        ...form, id: Date.now(), status: 'active', joinDate: new Date().toISOString().slice(0, 10),
        deliveries: 0, rating: 0, successRate: 0, earnings: 0, currentOrder: null, history: [],
      }
      setDrivers(prev => [newDriver, ...prev])
    }
    closeModal()
  }

  const suspendDriver = () => {
    setDrivers(prev => prev.map(d =>
      d.id !== selected.id ? d : { ...d, status: 'suspended', notes: suspendNote }
    ))
    closeModal()
  }

  const activateDriver = (driver) => {
    setDrivers(prev => prev.map(d => d.id !== driver.id ? d : { ...d, status: 'active', notes: '' }))
  }

  const deleteDriver = () => {
    setDrivers(prev => prev.filter(d => d.id !== selected.id))
    closeModal()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="container-fluid">

      {/* Page Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Drivers Management</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Deliveries</a></li>
          <li className="breadcrumb-item active">Drivers</li>
        </ul>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Drivers',     value: stats.total,          color: '#6366f1', icon: 'ri-group-line',          filter: 'all'          },
          { label: 'On Delivery',       value: stats.onDelivery,     color: '#3b82f6', icon: 'ri-truck-line',          filter: 'on_delivery'  },
          { label: 'Active / Standby',  value: stats.active,         color: '#22c55e', icon: 'ri-checkbox-circle-line',filter: 'active'       },
          { label: 'Off Duty',          value: stats.offDuty,        color: '#6b7280', icon: 'ri-moon-line',           filter: 'off_duty'     },
          { label: 'Suspended',         value: stats.suspended,      color: '#ef4444', icon: 'ri-forbid-line',         filter: 'suspended'    },
          { label: 'Total Deliveries',  value: stats.totalDeliveries,color: '#10b981', icon: 'ri-map-pin-line',        filter: null           },
        ].map(c => (
          <div key={c.label} className="col-6 col-md-4 col-xl-2">
            <div className="card p-3" style={{ borderLeft: `3px solid ${c.color}`, cursor: c.filter ? 'pointer' : 'default' }}
              onClick={() => c.filter && setFilterStatus(c.filter)}>
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 40, height: 40, background: c.color + '20' }}>
                  <i className={`${c.icon} fs-18`} style={{ color: c.color }} />
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: 11 }}>{c.label}</div>
                  <div className="fw-bold fs-18">{c.value}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Actions */}
      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <div className="input-group" style={{ maxWidth: 280 }}>
            <span className="input-group-text"><i className="ri-search-line" /></span>
            <input className="form-control" placeholder="Name, phone, zone..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {filterStatus !== 'all' && (
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setFilterStatus('all')}>
              <i className="ri-close-line me-1" />Clear Filter
            </button>
          )}
          <div className="ms-auto d-flex gap-2 align-items-center">
            <span className="text-muted small">{filtered.length} driver{filtered.length !== 1 ? 's' : ''}</span>
            <button className="btn btn-sm btn-primary" onClick={() => openModal('add')}>
              <i className="ri-add-line me-1" />Add Driver
            </button>
          </div>
        </div>
        {/* Status tabs */}
        <div className="border-top px-3" style={{ overflowX: 'auto' }}>
          <div className="d-flex" style={{ whiteSpace: 'nowrap' }}>
            {[{ key: 'all', label: 'All Drivers' }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ key: k, label: v.label }))].map(t => (
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

      {/* Drivers Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Driver</th><th>Contact</th><th>Zone</th><th>Vehicle</th>
                <th>Deliveries</th><th>Rating</th><th>Success</th><th>Earnings</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center text-muted py-5">No drivers found</td></tr>
              )}
              {filtered.map(driver => {
                const cfg = STATUS_CFG[driver.status]
                return (
                  <tr key={driver.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 38, height: 38, background: cfg.color + '20', color: cfg.color, fontSize: 12, fontWeight: 700 }}>
                          {driver.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="fw-medium">{driver.name}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>Since {driver.joinDate}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{driver.phone}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{driver.email}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{driver.zone}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{driver.vehicleType}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{driver.bike}</div>
                    </td>
                    <td className="fw-medium">{driver.deliveries}</td>
                    <td><StarRating rating={driver.rating} /></td>
                    <td>
                      <div className="fw-medium" style={{ color: driver.successRate >= 95 ? '#22c55e' : driver.successRate >= 85 ? '#f59e0b' : '#ef4444' }}>
                        {driver.successRate}%
                      </div>
                    </td>
                    <td className="fw-medium">{fmt(driver.earnings)}</td>
                    <td>
                      <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: 11 }}>
                        <i className={`${cfg.icon} me-1`} />{cfg.label}
                      </span>
                      {driver.currentOrder && (
                        <div className="text-muted" style={{ fontSize: 10 }}>{driver.currentOrder}</div>
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-secondary" title="View Profile" onClick={() => openModal('profile', driver)}>
                          <i className="ri-eye-line" />
                        </button>
                        <button className="btn btn-sm btn-outline-primary" title="Edit" onClick={() => openModal('edit', driver)}>
                          <i className="ri-edit-line" />
                        </button>
                        {driver.status === 'suspended'
                          ? <button className="btn btn-sm btn-outline-success" title="Activate" onClick={() => activateDriver(driver)}>
                              <i className="ri-checkbox-circle-line" />
                            </button>
                          : driver.status !== 'on_delivery' && (
                            <button className="btn btn-sm btn-outline-danger" title="Suspend" onClick={() => openModal('suspend', driver)}>
                              <i className="ri-forbid-line" />
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && closeModal()}>

          {/* ── DRIVER PROFILE ────────────────────────── */}
          {activeModal === 'profile' && selected && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
              {/* Header band */}
              <div style={{ background: '#1e293b', borderRadius: '12px 12px 0 0', padding: '24px 28px', color: '#fff' }}>
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 56, height: 56, background: STATUS_CFG[selected.status].color + '30',
                      border: `2px solid ${STATUS_CFG[selected.status].color}`, fontSize: 18, fontWeight: 700, color: STATUS_CFG[selected.status].color }}>
                    {selected.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-bold fs-16">{selected.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{selected.phone} · {selected.zone}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{selected.vehicleType} · {selected.bike}</div>
                  </div>
                  <div>
                    <span className="badge" style={{ background: STATUS_CFG[selected.status].bg, color: STATUS_CFG[selected.status].color, fontSize: 11 }}>
                      <i className={`${STATUS_CFG[selected.status].icon} me-1`} />{STATUS_CFG[selected.status].label}
                    </span>
                    {selected.currentOrder && (
                      <div className="small mt-1" style={{ opacity: 0.7 }}>Active: {selected.currentOrder}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4">
                {/* KPI row */}
                <div className="row g-3 mb-4">
                  {[
                    { label: 'Total Deliveries', value: selected.deliveries, color: '#6366f1' },
                    { label: 'Success Rate',     value: `${selected.successRate}%`, color: selected.successRate >= 95 ? '#22c55e' : selected.successRate >= 85 ? '#f59e0b' : '#ef4444' },
                    { label: 'Total Earnings',   value: fmt(selected.earnings), color: '#10b981' },
                  ].map(k => (
                    <div key={k.label} className="col-4">
                      <div className="border rounded p-3 text-center">
                        <div className="fw-bold fs-18" style={{ color: k.color }}>{k.value}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{k.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rating */}
                <div className="d-flex align-items-center gap-2 mb-4">
                  <StarRating rating={selected.rating} />
                  <span className="text-muted small">({selected.deliveries} deliveries)</span>
                </div>

                {/* Recent history */}
                <div className="mb-4">
                  <div className="fw-medium small mb-2">Recent Activity</div>
                  <table className="table table-sm border">
                    <thead className="table-light"><tr><th>Date</th><th>Orders</th><th>Earnings</th></tr></thead>
                    <tbody>
                      {selected.history.map((h, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 13 }}>{h.date}</td>
                          <td style={{ fontSize: 13 }}>{h.orders}</td>
                          <td style={{ fontSize: 13 }} className="fw-medium">{fmt(h.earnings)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Notes */}
                {selected.notes && (
                  <div className="alert alert-warning small p-3 mb-3">
                    <i className="ri-information-line me-1" />{selected.notes}
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button className="btn btn-outline-primary btn-sm" onClick={() => { closeModal(); setTimeout(() => openModal('edit', selected), 100) }}>
                    <i className="ri-edit-line me-1" />Edit
                  </button>
                  {selected.status !== 'suspended' && selected.status !== 'on_delivery' && (
                    <button className="btn btn-outline-danger btn-sm" onClick={() => { closeModal(); setTimeout(() => openModal('suspend', selected), 100) }}>
                      <i className="ri-forbid-line me-1" />Suspend
                    </button>
                  )}
                  {selected.status === 'suspended' && (
                    <button className="btn btn-outline-success btn-sm" onClick={() => { activateDriver(selected); closeModal() }}>
                      <i className="ri-checkbox-circle-line me-1" />Reinstate
                    </button>
                  )}
                  <button className="btn btn-outline-secondary btn-sm ms-auto" onClick={closeModal}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* ── ADD / EDIT DRIVER ─────────────────────── */}
          {(activeModal === 'add' || activeModal === 'edit') && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0">{isEditing ? 'Edit Driver' : 'Add New Driver'}</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div className="p-4">
                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label fw-medium small">Full Name *</label>
                    <input className="form-control" placeholder="e.g. Tunde Adeyemi"
                      value={form.name} onChange={e => setField('name', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Phone Number *</label>
                    <input className="form-control" placeholder="e.g. 08031234567"
                      value={form.phone} onChange={e => setField('phone', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium small">Email</label>
                    <input className="form-control" placeholder="e.g. driver@bemsfarms.com"
                      value={form.email} onChange={e => setField('email', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Vehicle Type</label>
                    <select className="form-select" value={form.vehicleType} onChange={e => setField('vehicleType', e.target.value)}>
                      {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Plate Number</label>
                    <input className="form-control" placeholder="e.g. LAG-234-AB"
                      value={form.bike} onChange={e => setField('bike', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium small">Primary Delivery Zone</label>
                    <select className="form-select" value={form.zone} onChange={e => setField('zone', e.target.value)}>
                      {ZONES.map(z => <option key={z}>{z}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium small">Notes (optional)</label>
                    <textarea className="form-control" rows={2} placeholder="Any notes about this driver..."
                      value={form.notes} onChange={e => setField('notes', e.target.value)} />
                  </div>
                </div>
                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-primary flex-fill" onClick={saveDriver} disabled={!form.name || !form.phone}>
                    <i className={`${isEditing ? 'ri-save-line' : 'ri-add-line'} me-1`} />
                    {isEditing ? 'Save Changes' : 'Add Driver'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SUSPEND DRIVER ────────────────────────── */}
          {activeModal === 'suspend' && selected && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420 }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0 text-danger"><i className="ri-forbid-line me-2" />Suspend Driver</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div className="p-4">
                <div className="alert alert-warning mb-3 small">
                  <i className="ri-alert-line me-1" />
                  Suspending <strong>{selected.name}</strong> will prevent them from being assigned new deliveries.
                  They can be reinstated at any time.
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium small">Reason for Suspension *</label>
                  <textarea className="form-control" rows={3}
                    placeholder="e.g. Multiple customer complaints, delivery fraud, missing items..."
                    value={suspendNote} onChange={e => setSuspendNote(e.target.value)} />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-danger flex-fill" onClick={suspendDriver} disabled={!suspendNote}>
                    <i className="ri-forbid-line me-1" />Suspend Driver
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
