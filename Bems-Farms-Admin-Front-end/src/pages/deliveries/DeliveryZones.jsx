import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const fmt  = (n) => `₦${Number(n || 0).toLocaleString()}`
const ETA_OPTIONS = ['15–30 mins', '30–45 mins', '45–60 mins', '60–90 mins', '1–2 hours', '2–3 hours']

const DRIVER_STATUS_COLOR = {
  on_delivery: '#3b82f6',
  active:      '#22c55e',
  off_duty:    '#6b7280',
  suspended:   '#ef4444',
}

const BLANK_FORM = {
  name: '', eta: ETA_OPTIONS[1], fee: '', minOrder: '', active: true,
  driverIds: [], areas: '', notes: '',
}

export default function DeliveryZones() {
  const [zones, setZones] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]             = useState('')
  const [filterActive, setFilterActive] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [selected, setSelected]         = useState(null)
  const [form, setForm]                 = useState(BLANK_FORM)
  const [isEditing, setIsEditing]       = useState(false)
  const [areasInput, setAreasInput]     = useState('')
  const [saving, setSaving]             = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/deliveries/zones')
      setZones((res.data.zones || []).map(z => ({
        id: z.id, name: z.zone_name, eta: z.estimated_eta || ETA_OPTIONS[1],
        fee: Number(z.delivery_fee || 0), minOrder: Number(z.min_order_amount || 0),
        active: !!z.is_active, driverIds: z.driver_ids || [],
        areas: Array.isArray(z.coverage_areas) ? z.coverage_areas : (z.coverage_areas ? JSON.parse(z.coverage_areas) : []),
        notes: z.notes || '', deliveries: Number(z.deliveries || 0), revenue: Number(z.revenue || 0),
      })))
      setDrivers(res.data.drivers || [])
    } catch {
      toast.error('Failed to load delivery zones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openModal = (type, zone = null) => {
    setSelected(zone)
    setActiveModal(type)
    if (type === 'edit' && zone) {
      setForm({ ...zone })
      setAreasInput(zone.areas.join(', '))
      setIsEditing(true)
    }
    if (type === 'add') {
      setForm(BLANK_FORM)
      setAreasInput('')
      setIsEditing(false)
    }
  }
  const closeModal = () => { setActiveModal(null); setSelected(null) }
  const setField   = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const toggleDriver = (id) => {
    setForm(p => ({
      ...p,
      driverIds: p.driverIds.includes(id) ? p.driverIds.filter(d => d !== id) : [...p.driverIds, id],
    }))
  }

  const stats = useMemo(() => ({
    total:           zones.length,
    active:          zones.filter(z => z.active).length,
    inactive:        zones.filter(z => !z.active).length,
    totalDeliveries: zones.reduce((s, z) => s + z.deliveries, 0),
    totalRevenue:    zones.reduce((s, z) => s + z.revenue, 0),
    avgFee:          zones.length ? Math.round(zones.reduce((s, z) => s + z.fee, 0) / zones.length) : 0,
  }), [zones])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return zones.filter(z => {
      const okActive = filterActive === 'all' || (filterActive === 'active' ? z.active : !z.active)
      const okSearch = !q || z.name.toLowerCase().includes(q) || z.areas.some(a => a.toLowerCase().includes(q))
      return okActive && okSearch
    })
  }, [zones, search, filterActive])

  async function saveZone() {
    const areas = areasInput.split(',').map(a => a.trim()).filter(Boolean)
    setSaving(true)
    try {
      const payload = {
        zone_name: form.name, delivery_fee: Number(form.fee), min_order_amount: Number(form.minOrder),
        estimated_eta: form.eta, coverage_areas: areas, driver_ids: form.driverIds,
        notes: form.notes || undefined, is_active: form.active,
      }
      if (isEditing) {
        await api.patch(`/admin/deliveries/zones/${selected.id}`, payload)
        toast.success('Zone updated')
      } else {
        await api.post('/admin/deliveries/zones', payload)
        toast.success('Zone created')
      }
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save zone')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(zone) {
    try {
      await api.patch(`/admin/deliveries/zones/${zone.id}`, { is_active: !zone.active })
      load()
    } catch {
      toast.error('Failed to update zone status')
    }
  }

  async function deleteZone() {
    try {
      await api.delete(`/admin/deliveries/zones/${selected.id}`)
      toast.success('Zone deleted')
      closeModal()
      load()
    } catch {
      toast.error('Failed to delete zone')
    }
  }

  return (
    <div className="container-fluid">

      {/* Page Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Delivery Zones</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/deliveries/active">Deliveries</Link></li>
          <li className="breadcrumb-item active">Zones</li>
        </ul>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Zones',      value: stats.total,           color: '#6366f1', icon: 'ri-map-2-line'              },
          { label: 'Active Zones',     value: stats.active,          color: '#22c55e', icon: 'ri-checkbox-circle-line'    },
          { label: 'Inactive Zones',   value: stats.inactive,        color: '#ef4444', icon: 'ri-close-circle-line'       },
          { label: 'Total Deliveries', value: stats.totalDeliveries, color: '#3b82f6', icon: 'ri-truck-line'             },
          { label: 'Zone Revenue',     value: fmt(stats.totalRevenue),color: '#10b981', icon: 'ri-money-dollar-circle-line'},
          { label: 'Avg Delivery Fee', value: fmt(stats.avgFee),     color: '#f59e0b', icon: 'ri-price-tag-3-line'       },
        ].map(c => (
          <div key={c.label} className="col-6 col-md-4 col-xl-2">
            <div className="card p-3" style={{ borderLeft: `3px solid ${c.color}` }}>
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

      {/* Filter + Actions bar */}
      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <div className="input-group" style={{ maxWidth: 280 }}>
            <span className="input-group-text"><i className="ri-search-line" /></span>
            <input className="form-control" placeholder="Zone name, area..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="btn-group btn-group-sm">
            {[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'inactive', label: 'Inactive' }].map(t => (
              <button key={t.key} className={`btn ${filterActive === t.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setFilterActive(t.key)}>{t.label}</button>
            ))}
          </div>
          <div className="ms-auto d-flex gap-2 align-items-center">
            <span className="text-muted small">{filtered.length} zone{filtered.length !== 1 ? 's' : ''}</span>
            <button className="btn btn-sm btn-primary" onClick={() => openModal('add')}>
              <i className="ri-add-line me-1" />Add Zone
            </button>
          </div>
        </div>
      </div>

      {/* Zone Cards Grid */}
      <div className="row g-3">
        {loading && (
          <div className="col-12"><div className="card p-5 text-center text-muted">Loading zones…</div></div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="col-12">
            <div className="card p-5 text-center text-muted">No zones found</div>
          </div>
        )}
        {!loading && filtered.map(zone => {
          const assignedDrivers = drivers.filter(d => zone.driverIds.includes(d.id))
          return (
            <div key={zone.id} className="col-12 col-md-6 col-xl-4">
              <div className="card h-100" style={{ borderTop: `3px solid ${zone.active ? '#22c55e' : '#ef4444'}` }}>
                <div className="card-body">
                  {/* Header */}
                  <div className="d-flex align-items-start justify-content-between mb-3">
                    <div>
                      <div className="fw-bold fs-15">{zone.name}</div>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <span className="badge" style={{ background: zone.active ? '#dcfce7' : '#fee2e2', color: zone.active ? '#16a34a' : '#dc2626', fontSize: 10 }}>
                          <i className={`${zone.active ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} me-1`} />
                          {zone.active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-muted" style={{ fontSize: 11 }}>
                          <i className="ri-time-line me-1" />{zone.eta}
                        </span>
                      </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <button className="btn btn-sm btn-outline-secondary"
                        onClick={e => {
                          const menu = e.currentTarget.nextSibling
                          menu.style.display = menu.style.display === 'block' ? 'none' : 'block'
                        }}>
                        <i className="ri-more-2-line" />
                      </button>
                      <ul className="dropdown-menu" style={{ display: 'none', position: 'absolute', right: 0, top: '100%', zIndex: 10, minWidth: 160 }}>
                        <li><button className="dropdown-item small" onClick={() => openModal('view', zone)}><i className="ri-eye-line me-2" />View Details</button></li>
                        <li><button className="dropdown-item small" onClick={() => openModal('edit', zone)}><i className="ri-edit-line me-2" />Edit Zone</button></li>
                        <li><hr className="dropdown-divider" /></li>
                        <li>
                          <button className="dropdown-item small" onClick={() => toggleActive(zone)}>
                            <i className={`${zone.active ? 'ri-close-circle-line' : 'ri-checkbox-circle-line'} me-2`} />
                            {zone.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </li>
                        <li><button className="dropdown-item small text-danger" onClick={() => openModal('delete', zone)}><i className="ri-delete-bin-line me-2" />Delete</button></li>
                      </ul>
                    </div>
                  </div>

                  {/* Fee / Min Order / Deliveries */}
                  <div className="d-flex gap-3 mb-3">
                    <div className="border rounded p-2 flex-fill text-center">
                      <div className="fw-bold fs-15 text-primary">{fmt(zone.fee)}</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Delivery Fee</div>
                    </div>
                    <div className="border rounded p-2 flex-fill text-center">
                      <div className="fw-bold fs-15">{fmt(zone.minOrder)}</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Min. Order</div>
                    </div>
                    <div className="border rounded p-2 flex-fill text-center">
                      <div className="fw-bold fs-15 text-success">{zone.deliveries}</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Deliveries</div>
                    </div>
                  </div>

                  {/* Coverage Areas */}
                  <div className="mb-3">
                    <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Coverage Areas</div>
                    <div className="d-flex flex-wrap gap-1">
                      {zone.areas.slice(0, 4).map(a => (
                        <span key={a} className="badge bg-light text-dark border" style={{ fontSize: 10, fontWeight: 400 }}>{a}</span>
                      ))}
                      {zone.areas.length > 4 && (
                        <span className="badge bg-light text-muted border" style={{ fontSize: 10 }}>+{zone.areas.length - 4} more</span>
                      )}
                    </div>
                  </div>

                  {/* Assigned Drivers */}
                  <div className="mb-3">
                    <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Assigned Drivers</div>
                    {assignedDrivers.length === 0
                      ? <div className="text-warning small"><i className="ri-alert-line me-1" />No driver assigned</div>
                      : (
                        <div className="d-flex flex-wrap gap-1">
                          {assignedDrivers.map(d => (
                            <div key={d.id} className="d-flex align-items-center gap-1 border rounded px-2 py-1"
                              style={{ background: (DRIVER_STATUS_COLOR[d.status] || '#6b7280') + '10', fontSize: 11 }}>
                              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width: 18, height: 18, background: (DRIVER_STATUS_COLOR[d.status] || '#6b7280') + '30', color: DRIVER_STATUS_COLOR[d.status] || '#6b7280', fontSize: 8, fontWeight: 700 }}>
                                {d.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              {d.name.split(' ')[0]}
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </div>

                  {/* Notes */}
                  {zone.notes && (
                    <div className="p-2 rounded small" style={{ background: '#fffbeb', borderLeft: '3px solid #f59e0b', fontSize: 12, color: '#92400e' }}>
                      {zone.notes}
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="card-footer bg-transparent d-flex gap-2">
                  <button className="btn btn-sm btn-outline-primary flex-fill" onClick={() => openModal('edit', zone)}>
                    <i className="ri-edit-line me-1" />Edit
                  </button>
                  <button className="btn btn-sm btn-outline-secondary flex-fill" onClick={() => openModal('view', zone)}>
                    <i className="ri-eye-line me-1" />Details
                  </button>
                  <button className={`btn btn-sm flex-fill ${zone.active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                    onClick={() => toggleActive(zone)}>
                    <i className={`${zone.active ? 'ri-pause-line' : 'ri-play-line'} me-1`} />
                    {zone.active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════ */}

      {activeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && closeModal()}>

          {/* ── VIEW ZONE DETAILS ─────────────────────── */}
          {activeModal === 'view' && selected && (() => {
            const assignedDrivers = drivers.filter(d => selected.driverIds.includes(d.id))
            return (
              <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ background: '#1e293b', borderRadius: '12px 12px 0 0', padding: '24px 28px', color: '#fff' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-bold fs-16">{selected.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        <i className="ri-time-line me-1" />{selected.eta} ETA ·
                        <span className={`ms-2 badge ${selected.active ? 'bg-success' : 'bg-danger'}`}>{selected.active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line" /></button>
                  </div>
                </div>
                <div className="p-4">
                  {/* KPIs */}
                  <div className="row g-3 mb-4">
                    {[
                      { label: 'Delivery Fee',  value: fmt(selected.fee),      color: '#3b82f6' },
                      { label: 'Min. Order',    value: fmt(selected.minOrder), color: '#6366f1' },
                      { label: 'Total Orders',  value: selected.deliveries,    color: '#22c55e' },
                      { label: 'Zone Revenue',  value: fmt(selected.revenue),  color: '#10b981' },
                    ].map(k => (
                      <div key={k.label} className="col-6">
                        <div className="border rounded p-3 text-center">
                          <div className="fw-bold fs-16" style={{ color: k.color }}>{k.value}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{k.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Areas */}
                  <div className="mb-4">
                    <div className="fw-medium small mb-2">Coverage Areas</div>
                    <div className="d-flex flex-wrap gap-1">
                      {selected.areas.map(a => (
                        <span key={a} className="badge bg-light text-dark border" style={{ fontSize: 11, fontWeight: 400 }}>{a}</span>
                      ))}
                    </div>
                  </div>

                  {/* Drivers */}
                  <div className="mb-4">
                    <div className="fw-medium small mb-2">Assigned Drivers ({assignedDrivers.length})</div>
                    {assignedDrivers.length === 0
                      ? <div className="alert alert-warning small p-2 mb-0"><i className="ri-alert-line me-1" />No driver assigned to this zone.</div>
                      : assignedDrivers.map(d => (
                        <div key={d.id} className="d-flex align-items-center gap-2 border rounded p-2 mb-2">
                          <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: 32, height: 32, background: (DRIVER_STATUS_COLOR[d.status] || '#6b7280') + '20', color: DRIVER_STATUS_COLOR[d.status] || '#6b7280', fontSize: 11, fontWeight: 700 }}>
                            {d.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-grow-1 fw-medium small">{d.name}</div>
                          <span className="badge" style={{ background: (DRIVER_STATUS_COLOR[d.status] || '#6b7280') + '20', color: DRIVER_STATUS_COLOR[d.status] || '#6b7280', fontSize: 10 }}>
                            {(d.status || '').replace('_', ' ')}
                          </span>
                        </div>
                      ))
                    }
                  </div>

                  {selected.notes && (
                    <div className="alert alert-warning small p-3 mb-3">
                      <i className="ri-information-line me-1" />{selected.notes}
                    </div>
                  )}

                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-primary btn-sm flex-fill"
                      onClick={() => { closeModal(); setTimeout(() => openModal('edit', selected), 100) }}>
                      <i className="ri-edit-line me-1" />Edit Zone
                    </button>
                    <button className={`btn btn-sm flex-fill ${selected.active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                      onClick={() => { toggleActive(selected); closeModal() }}>
                      {selected.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="btn btn-outline-secondary btn-sm" onClick={closeModal}>Close</button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── ADD / EDIT ZONE ───────────────────────── */}
          {(activeModal === 'add' || activeModal === 'edit') && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0">{isEditing ? `Edit: ${selected?.name}` : 'Add New Zone'}</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div className="p-4">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-medium small">Zone Name *</label>
                    <input className="form-control" placeholder="e.g. Victoria Island"
                      value={form.name} onChange={e => setField('name', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Delivery Fee (₦) *</label>
                    <input className="form-control" type="number" placeholder="e.g. 1500"
                      value={form.fee} onChange={e => setField('fee', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Minimum Order (₦) *</label>
                    <input className="form-control" type="number" placeholder="e.g. 5000"
                      value={form.minOrder} onChange={e => setField('minOrder', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Estimated ETA</label>
                    <select className="form-select" value={form.eta} onChange={e => setField('eta', e.target.value)}>
                      {ETA_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Status</label>
                    <select className="form-select" value={form.active ? 'active' : 'inactive'}
                      onChange={e => setField('active', e.target.value === 'active')}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium small">Coverage Areas <span className="text-muted">(comma-separated)</span></label>
                    <input className="form-control" placeholder="e.g. VI, Onikan, Bar Beach, Eko Atlantic"
                      value={areasInput} onChange={e => setAreasInput(e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium small">Assign Drivers</label>
                    <div className="border rounded p-3">
                      {drivers.length === 0 && <div className="text-muted small">No drivers available yet.</div>}
                      {drivers.map(d => (
                        <div key={d.id} className="form-check mb-1">
                          <input className="form-check-input" type="checkbox" id={`drv-${d.id}`}
                            checked={form.driverIds.includes(d.id)} onChange={() => toggleDriver(d.id)} />
                          <label className="form-check-label small" htmlFor={`drv-${d.id}`}>
                            {d.name}
                            <span className="ms-2 badge" style={{ background: (DRIVER_STATUS_COLOR[d.status] || '#6b7280') + '20', color: DRIVER_STATUS_COLOR[d.status] || '#6b7280', fontSize: 10 }}>
                              {(d.status || '').replace('_', ' ')}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium small">Notes (optional)</label>
                    <textarea className="form-control" rows={2}
                      placeholder="Any special instructions or notes for this zone..."
                      value={form.notes} onChange={e => setField('notes', e.target.value)} />
                  </div>
                </div>
                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-primary flex-fill" onClick={saveZone}
                    disabled={!form.name || !form.fee || !form.minOrder || saving}>
                    <i className={`${isEditing ? 'ri-save-line' : 'ri-add-line'} me-1`} />
                    {saving ? 'Saving…' : (isEditing ? 'Save Changes' : 'Create Zone')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── DELETE CONFIRM ────────────────────────── */}
          {activeModal === 'delete' && selected && (
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 400 }}>
              <div className="p-4">
                <div className="text-center mb-4">
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: 56, height: 56, background: '#fee2e2' }}>
                    <i className="ri-delete-bin-line fs-24 text-danger" />
                  </div>
                  <h5 className="mb-1">Delete Zone?</h5>
                  <p className="text-muted small mb-0">
                    Are you sure you want to delete <strong>{selected.name}</strong>?
                    This cannot be undone.
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-danger flex-fill" onClick={deleteZone}>
                    <i className="ri-delete-bin-line me-1" />Delete Zone
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
