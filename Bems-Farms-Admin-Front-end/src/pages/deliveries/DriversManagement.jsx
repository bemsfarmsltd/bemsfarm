import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const STATUS_CFG = {
  active:      { label: 'Active',      color: '#22c55e', bg: '#dcfce7', icon: 'ri-checkbox-circle-line'  },
  on_delivery: { label: 'On Delivery', color: '#3b82f6', bg: '#dbeafe', icon: 'ri-truck-line'         },
  off_duty:    { label: 'Off Duty',    color: '#6b7280', bg: '#f3f4f6', icon: 'ri-moon-line'             },
  suspended:   { label: 'Suspended',   color: '#ef4444', bg: '#fee2e2', icon: 'ri-forbid-line'           },
}

const VEHICLE_TYPES = [
  { value: 'motorcycle', label: 'Motorcycle / Bike' },
  { value: 'bicycle',    label: 'Bicycle / E-Bike' },
  { value: 'car',        label: 'Car / Sedan' },
  { value: 'van',        label: 'Delivery Van' },
]

const BLANK_FORM = {
  name: '',
  phone: '',
  email: '',
  password: '',
  vehicle_type: 'motorcycle',
  vehicle_plate: '',
  commission_per_delivery: '500',
  zone_id: '',
  notes: '',
  license_number: '',
  emergency_contact: '',
}

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`

function StarRating({ rating }) {
  const r = Number(rating || 0)
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <i key={i} className={i <= Math.round(r) ? 'ri-star-fill text-warning' : 'ri-star-line text-muted'} style={{ fontSize: 12 }} />
      ))}
      <span className="ms-1 small fw-medium">{r.toFixed(1)}</span>
    </span>
  )
}

export default function DriversManagement() {
  const [drivers, setDrivers] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [selected, setSelected]         = useState(null)
  const [form, setForm]                 = useState(BLANK_FORM)
  const [suspendNote, setSuspendNote]   = useState('')
  const [isEditing, setIsEditing]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const [onboardedCredentials, setOnboardedCredentials] = useState(null)
  const [newPassword, setNewPassword]   = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [drvRes, zoneRes] = await Promise.all([
        api.get('/admin/deliveries/drivers', { params: { search: search || undefined, status: filterStatus !== 'all' ? filterStatus : undefined } }),
        api.get('/admin/deliveries/zones').catch(() => ({ data: { zones: [] } })),
      ])
      setDrivers(drvRes.data.drivers || [])
      setZones(zoneRes.data.zones || [])
    } catch {
      toast.error('Failed to load drivers')
    } finally {
      setLoading(false)
    }
  }, [search, filterStatus])

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  const openModal = (type, driver = null) => {
    setSelected(driver)
    setActiveModal(type)
    setSuspendNote('')
    setNewPassword('')
    if (type === 'add') { 
      setForm({ ...BLANK_FORM, password: Math.floor(100000 + Math.random() * 900000).toString() }); 
      setIsEditing(false) 
    }
    if (type === 'edit' && driver) {
      setForm({
        name: driver.name,
        phone: driver.phone,
        email: driver.email || '',
        password: '',
        vehicle_type: (driver.vehicle_type || 'motorcycle').toLowerCase(),
        vehicle_plate: driver.vehicle_plate || '',
        commission_per_delivery: driver.commission_per_delivery || '500',
        zone_id: driver.zone_id || '',
        notes: driver.notes || '',
        license_number: driver.license_number || '',
        emergency_contact: driver.emergency_contact || '',
      })
      setIsEditing(true)
    }
  }
  const closeModal = () => { setActiveModal(null); setSelected(null) }
  const setField   = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const stats = useMemo(() => ({
    total:       drivers.length,
    active:      drivers.filter(d => d.status === 'active').length,
    onDelivery:  drivers.filter(d => d.status === 'on_delivery').length,
    offDuty:     drivers.filter(d => d.status === 'off_duty').length,
    suspended:   drivers.filter(d => d.status === 'suspended').length,
    totalDeliveries: drivers.reduce((s, d) => s + Number(d.total_deliveries || 0), 0),
  }), [drivers])

  async function saveDriver() {
    if (!form.name || !form.phone) return
    setSaving(true)
    try {
      if (isEditing) {
        await api.patch(`/admin/deliveries/drivers/${selected.id}`, form)
        toast.success('Driver profile updated')
        closeModal()
      } else {
        const res = await api.post('/admin/deliveries/drivers', form)
        const driverData = res.data?.driver || {}
        toast.success('🎉 Driver onboarded successfully!')
        setOnboardedCredentials({
          name: form.name,
          phone: form.phone,
          password: form.password || form.phone.replace(/\s+/g, ''),
          vehicle_plate: form.vehicle_plate,
          commission: form.commission_per_delivery,
        })
        setActiveModal('onboard_success')
      }
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save driver')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword() {
    if (!newPassword || !selected) return
    setUpdatingPassword(true)
    try {
      await api.put(`/admin/deliveries/drivers/${selected.id}/credentials`, { password: newPassword })
      toast.success(`Password updated for ${selected.name}`)
      closeModal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password')
    } finally {
      setUpdatingPassword(false)
    }
  }

  async function suspendDriver() {
    try {
      await api.patch(`/admin/deliveries/drivers/${selected.id}/suspend`, { reason: suspendNote })
      toast.success('Driver suspended')
      closeModal()
      load()
    } catch {
      toast.error('Failed to suspend driver')
    }
  }

  async function activateDriver(driver) {
    try {
      await api.patch(`/admin/deliveries/drivers/${driver.id}/activate`)
      toast.success('Driver reinstated')
      load()
    } catch {
      toast.error('Failed to reinstate driver')
    }
  }

  return (
    <div className="container-fluid">

      {/* Page Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <h6 className="flex-grow-1 mb-0">Drivers Management</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/deliveries/active">Deliveries</Link></li>
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
            <span className="text-muted small">{drivers.length} driver{drivers.length !== 1 ? 's' : ''}</span>
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
              {loading && (
                <tr><td colSpan={10} className="text-center text-muted py-5">Loading drivers…</td></tr>
              )}
              {!loading && drivers.length === 0 && (
                <tr><td colSpan={10} className="text-center text-muted py-5">No drivers found</td></tr>
              )}
              {!loading && drivers.map(driver => {
                const cfg = STATUS_CFG[driver.status] || STATUS_CFG.active
                const successRate = Number(driver.success_rate || 0)
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
                          <div className="text-muted" style={{ fontSize: 11 }}>Since {driver.joined_date ? driver.joined_date.slice(0,10) : '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{driver.phone}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{driver.email || '—'}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{driver.zone || '—'}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{driver.vehicle_type || '—'}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{driver.vehicle_plate || '—'}</div>
                    </td>
                    <td className="fw-medium">{driver.total_deliveries || 0}</td>
                    <td><StarRating rating={driver.rating} /></td>
                    <td>
                      <div className="fw-medium" style={{ color: successRate >= 95 ? '#22c55e' : successRate >= 85 ? '#f59e0b' : '#ef4444' }}>
                        {successRate}%
                      </div>
                    </td>
                    <td className="fw-medium">{fmt(driver.earnings)}</td>
                    <td>
                      <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: 11 }}>
                        <i className={`${cfg.icon} me-1`} />{cfg.label}
                      </span>
                      {driver.current_order && (
                        <div className="text-muted" style={{ fontSize: 10 }}>Order #{driver.current_order}</div>
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
          {activeModal === 'profile' && selected && (() => {
            const cfg = STATUS_CFG[selected.status] || STATUS_CFG.active
            const successRate = Number(selected.success_rate || 0)
            return (
              <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
                {/* Header band */}
                <div style={{ background: '#1e293b', borderRadius: '12px 12px 0 0', padding: '24px 28px', color: '#fff' }}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: 56, height: 56, background: cfg.color + '30',
                        border: `2px solid ${cfg.color}`, fontSize: 18, fontWeight: 700, color: cfg.color }}>
                      {selected.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold fs-16">{selected.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{selected.phone} · {selected.zone || 'No zone assigned'}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{selected.vehicle_type || '—'} · {selected.vehicle_plate || '—'}</div>
                    </div>
                    <div>
                      <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: 11 }}>
                        <i className={`${cfg.icon} me-1`} />{cfg.label}
                      </span>
                      {selected.current_order && (
                        <div className="small mt-1" style={{ opacity: 0.7 }}>Active: Order #{selected.current_order}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {/* KPI row */}
                  <div className="row g-3 mb-4">
                    {[
                      { label: 'Total Deliveries', value: selected.total_deliveries || 0, color: '#6366f1' },
                      { label: 'Success Rate',     value: `${successRate}%`, color: successRate >= 95 ? '#22c55e' : successRate >= 85 ? '#f59e0b' : '#ef4444' },
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
                    <span className="text-muted small">({selected.total_deliveries || 0} deliveries)</span>
                  </div>

                  {/* Notes */}
                  {selected.notes && (
                    <div className="alert alert-warning small p-3 mb-3">
                      <i className="ri-information-line me-1" />{selected.notes}
                    </div>
                  )}

                  {/* Driver App Credentials & Reset */}
                  <div className="border rounded p-3 mb-3 bg-light-subtle">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="fw-bold small text-dark"><i className="ri-key-2-line me-1 text-primary" />Driver App Access</span>
                      <span className="badge bg-success-subtle text-success fs-xs">Active Account</span>
                    </div>
                    <div className="d-flex gap-2">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Enter new 6-digit PIN / password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-primary text-nowrap"
                        disabled={!newPassword || updatingPassword}
                        onClick={handleResetPassword}
                      >
                        {updatingPassword ? 'Updating…' : 'Reset Password'}
                      </button>
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-primary btn-sm" onClick={() => { closeModal(); setTimeout(() => openModal('edit', selected), 100) }}>
                      <i className="ri-edit-line me-1" />Edit Profile
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
            )
          })()}

          {/* ── ONBOARD / ADD DRIVER MODAL ─────────────── */}
          {(activeModal === 'add' || activeModal === 'edit') && (
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto' }} className="shadow-2xl">
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom bg-light-subtle rounded-top-4">
                <div>
                  <h5 className="mb-0 fw-bold">{isEditing ? 'Edit Driver Profile' : '🚀 Onboard New Dispatch Driver'}</h5>
                  <p className="text-muted small mb-0">
                    {isEditing ? 'Update fleet vehicle and contact details.' : 'Create driver account and generate Driver App login credentials.'}
                  </p>
                </div>
                <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={closeModal}><i className="ri-close-line" /></button>
              </div>
              <div className="p-4">
                <div className="row g-3">
                  <div className="col-12">
                    <div className="fw-bold small text-uppercase tracking-wider text-muted mb-1">
                      1. Driver Identity &amp; Contact
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Full Legal Name *</label>
                    <input className="form-control" placeholder="e.g. Samuel Okafor"
                      value={form.name} onChange={e => setField('name', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Phone Number (Login ID) *</label>
                    <input className="form-control" placeholder="e.g. 08012345678"
                      value={form.phone} onChange={e => setField('phone', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Email Address</label>
                    <input className="form-control" placeholder="e.g. driver@bemsfarms.com"
                      value={form.email} onChange={e => setField('email', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Emergency Contact Phone</label>
                    <input className="form-control" placeholder="e.g. 08098765432 (Next of Kin)"
                      value={form.emergency_contact} onChange={e => setField('emergency_contact', e.target.value)} />
                  </div>

                  {!isEditing && (
                    <div className="col-12 bg-primary-subtle p-3 rounded-3">
                      <label className="form-label fw-bold small text-primary mb-1">
                        <i className="ri-lock-password-line me-1" />Driver App Login Password / PIN
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. 648291"
                          value={form.password}
                          onChange={(e) => setField('password', e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => setField('password', Math.floor(100000 + Math.random() * 900000).toString())}
                        >
                          Generate PIN
                        </button>
                      </div>
                      <span className="text-muted fs-xs mt-1 d-block">
                        The driver will use this PIN to log into the Bems Farms Driver App.
                      </span>
                    </div>
                  )}

                  <div className="col-12 mt-3">
                    <div className="fw-bold small text-uppercase tracking-wider text-muted mb-1">
                      2. Vehicle &amp; Fleet Information
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Vehicle Type</label>
                    <select className="form-select" value={form.vehicle_type} onChange={e => setField('vehicle_type', e.target.value)}>
                      {VEHICLE_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Vehicle Plate Number *</label>
                    <input className="form-control" placeholder="e.g. ABA-492-XA"
                      value={form.vehicle_plate} onChange={e => setField('vehicle_plate', e.target.value)} />
                  </div>

                  <div className="col-12 mt-3">
                    <div className="fw-bold small text-uppercase tracking-wider text-muted mb-1">
                      3. Dispatch Zone &amp; Remuneration
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Primary Delivery Zone</label>
                    <select className="form-select" value={form.zone_id} onChange={e => setField('zone_id', e.target.value)}>
                      <option value="">— Auto-Dispatch (All Zones) —</option>
                      {zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Commission Per Delivery (₦)</label>
                    <input className="form-control" type="number" placeholder="500"
                      value={form.commission_per_delivery} onChange={e => setField('commission_per_delivery', e.target.value)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium small">Onboarding Notes (optional)</label>
                    <textarea className="form-control" rows={2} placeholder="NIN verification, guarantor notes, physical inspection notes..."
                      value={form.notes} onChange={e => setField('notes', e.target.value)} />
                  </div>
                </div>

                <div className="d-flex gap-2 mt-4 pt-2 border-top">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-primary flex-fill fw-bold py-2" onClick={saveDriver} disabled={!form.name || !form.phone || saving}>
                    <i className={`${isEditing ? 'ri-save-line' : 'ri-user-add-line'} me-1`} />
                    {saving ? 'Saving…' : (isEditing ? 'Save Changes' : 'Complete Onboarding')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── ONBOARD SUCCESS & CREDENTIAL SHARE MODAL ── */}
          {activeModal === 'onboard_success' && onboardedCredentials && (
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460 }} className="shadow-2xl overflow-hidden">
              <div className="bg-success text-white p-4 text-center">
                <div className="rounded-circle bg-white text-success mx-auto d-flex align-items-center justify-content-center mb-2" style={{ width: 48, height: 48, fontSize: 24 }}>
                  <i className="ri-checkbox-circle-fill" />
                </div>
                <h5 className="fw-bold mb-1">Driver Onboarded!</h5>
                <p className="small mb-0 opacity-80">Credentials generated for Driver App</p>
              </div>

              <div className="p-4">
                <div className="border rounded-3 p-3 bg-light mb-3">
                  <div className="d-flex justify-content-between mb-1.5 small">
                    <span className="text-muted">Driver Name:</span>
                    <span className="fw-bold">{onboardedCredentials.name}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1.5 small">
                    <span className="text-muted">Login Phone:</span>
                    <span className="fw-bold text-primary">{onboardedCredentials.phone}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1.5 small">
                    <span className="text-muted">Temporary Password:</span>
                    <span className="fw-bold text-danger fs-14 font-monospace">{onboardedCredentials.password}</span>
                  </div>
                  <div className="d-flex justify-content-between small">
                    <span className="text-muted">Commission / Order:</span>
                    <span className="fw-bold text-success">₦{onboardedCredentials.commission || 500}</span>
                  </div>
                </div>

                <div className="d-flex flex-column gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-1.5"
                    onClick={() => {
                      const text = `Welcome to Bems Farms Delivery Fleet!\n\nHello ${onboardedCredentials.name},\nYour Driver App account is ready:\n• Login Phone: ${onboardedCredentials.phone}\n• Password: ${onboardedCredentials.password}\n• Commission per Delivery: ₦${onboardedCredentials.commission || 500}\n\nPlease open the Driver App and toggle your status to Active when starting shift.`;
                      navigator.clipboard.writeText(text);
                      toast.success('📋 Driver credentials copied to clipboard!');
                    }}
                  >
                    <i className="ri-file-copy-line" />
                    <span>Copy Onboarding Info</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Welcome to Bems Farms Delivery Fleet!\n\nHello ${onboardedCredentials.name},\nYour Driver App account is active:\n• Phone: ${onboardedCredentials.phone}\n• Password: ${onboardedCredentials.password}\n\nPlease log into the Bems Farms Driver App.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-success d-flex align-items-center justify-content-center gap-1.5"
                  >
                    <i className="ri-whatsapp-line" />
                    <span>Share via WhatsApp</span>
                  </a>

                  <button className="btn btn-secondary mt-1" onClick={closeModal}>
                    Done
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

