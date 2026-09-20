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

const ONBOARDING_STATUS_CFG = {
  invited: {
    label: 'Invited (Pending Docs)',
    color: '#2563eb',
    bg: '#dbeafe',
    icon: 'ri-mail-send-line',
  },
  documents_submitted: {
    label: 'Documents Submitted (Review Needed)',
    color: '#d97706',
    bg: '#fef3c7',
    icon: 'ri-file-text-line',
  },
  approved: {
    label: 'Compliant & Approved',
    color: '#16a34a',
    bg: '#dcfce7',
    icon: 'ri-shield-check-line',
  },
  rejected: {
    label: 'Compliance Rejected',
    color: '#dc2626',
    bg: '#fee2e2',
    icon: 'ri-error-warning-line',
  },
}

const VEHICLE_TYPES = [
  { value: 'motorcycle', label: 'Motorcycle / Delivery Bike' },
  { value: 'tricycle',   label: 'Tricycle (Keke)' },
  { value: 'car',        label: 'Car / Sedan' },
  { value: 'van',        label: 'Delivery Van' },
  { value: 'truck',      label: 'Light Truck' },
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
  onboard_mode: 'invite', // 'invite' | 'direct'
}

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`

function StarRating({ rating }) {
  const r = Number(rating || 0)
  return (
    <span>
      {[1, 2, 3, 4, 5].map((i) => (
        <i
          key={i}
          className={i <= Math.round(r) ? 'ri-star-fill text-warning' : 'ri-star-line text-muted'}
          style={{ fontSize: 12 }}
        />
      ))}
      <span className="ms-1 small fw-medium">{r.toFixed(1)}</span>
    </span>
  )
}

export default function DriversManagement() {
  const [drivers, setDrivers] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [suspendNote, setSuspendNote] = useState('')
  const [complianceRejectNotes, setComplianceRejectNotes] = useState('')
  const [viewingDocument, setViewingDocument] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [onboardedCredentials, setOnboardedCredentials] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [drvRes, zoneRes] = await Promise.all([
        api.get('/admin/deliveries/drivers', {
          params: {
            search: search || undefined,
            status: filterStatus !== 'all' && !filterStatus.startsWith('onboarding_') ? filterStatus : undefined,
          },
        }),
        api.get('/admin/deliveries/zones').catch(() => ({ data: { zones: [] } })),
      ])
      let allDrivers = drvRes.data.drivers || []
      if (filterStatus === 'onboarding_review') {
        allDrivers = allDrivers.filter((d) => d.onboarding_status === 'documents_submitted')
      } else if (filterStatus === 'onboarding_invited') {
        allDrivers = allDrivers.filter((d) => d.onboarding_status === 'invited')
      }
      setDrivers(allDrivers)
      setZones(zoneRes.data.zones || [])
    } catch {
      toast.error('Failed to load drivers')
    } finally {
      setLoading(false)
    }
  }, [search, filterStatus])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const openModal = (type, driver = null) => {
    setSelected(driver)
    setActiveModal(type)
    setSuspendNote('')
    setComplianceRejectNotes('')
    setNewPassword('')
    setViewingDocument(null)

    if (type === 'add') {
      setForm({
        ...BLANK_FORM,
        password: Math.floor(100000 + Math.random() * 900000).toString(),
        onboard_mode: 'invite',
      })
      setIsEditing(false)
    }
    if (type === 'edit' && driver) {
      setForm({
        name: driver.name || '',
        phone: driver.phone || '',
        email: driver.email || '',
        password: '',
        vehicle_type: (driver.vehicle_type || 'motorcycle').toLowerCase(),
        vehicle_plate: driver.vehicle_plate || '',
        commission_per_delivery: driver.commission_per_delivery || '500',
        zone_id: driver.zone_id || '',
        notes: driver.notes || '',
        license_number: driver.license_number || '',
        emergency_contact: driver.emergency_contact_phone || '',
        onboard_mode: 'direct',
      })
      setIsEditing(true)
    }
  }

  const closeModal = () => {
    setActiveModal(null)
    setSelected(null)
    setViewingDocument(null)
  }

  const setField = (f, v) => setForm((p) => ({ ...p, [f]: v }))

  const stats = useMemo(
    () => ({
      total: drivers.length,
      active: drivers.filter((d) => d.status === 'active').length,
      onDelivery: drivers.filter((d) => d.status === 'on_delivery').length,
      offDuty: drivers.filter((d) => d.status === 'off_duty').length,
      suspended: drivers.filter((d) => d.status === 'suspended').length,
      pendingCompliance: drivers.filter((d) => d.onboarding_status === 'documents_submitted').length,
      invited: drivers.filter((d) => d.onboarding_status === 'invited').length,
      totalDeliveries: drivers.reduce((s, d) => s + Number(d.total_deliveries || 0), 0),
    }),
    [drivers]
  )

  async function saveDriver() {
    if (!form.name || !form.phone) return
    setSaving(true)
    try {
      if (isEditing) {
        await api.patch(`/admin/deliveries/drivers/${selected.id}`, form)
        toast.success('Driver profile updated')
        closeModal()
      } else if (form.onboard_mode === 'invite') {
        if (!form.email) {
          toast.error('Email address is required to send an onboarding invitation')
          setSaving(false)
          return
        }
        const res = await api.post('/admin/deliveries/drivers/invite', form)
        toast.success(`📧 Onboarding invitation email sent to ${form.email}!`)
        setOnboardedCredentials({
          name: form.name,
          email: form.email,
          phone: form.phone,
          tempPin: res.data?.tempPin,
          inviteUrl: res.data?.inviteUrl,
          mode: 'invite',
        })
        setActiveModal('onboard_success')
      } else {
        const res = await api.post('/admin/deliveries/drivers', form)
        toast.success('🎉 Driver onboarded and activated directly!')
        setOnboardedCredentials({
          name: form.name,
          phone: form.phone,
          password: form.password || form.phone.replace(/\s+/g, ''),
          vehicle_plate: form.vehicle_plate,
          commission: form.commission_per_delivery,
          mode: 'direct',
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

  async function handleComplianceDecision(action) {
    if (!selected) return
    if (action === 'reject' && !complianceRejectNotes.trim()) {
      toast.error('Please enter notes explaining the correction or re-upload required.')
      return
    }

    setSaving(true)
    try {
      await api.patch(`/admin/deliveries/drivers/${selected.id}/compliance`, {
        action,
        notes: complianceRejectNotes.trim() || undefined,
      })
      if (action === 'approve') {
        toast.success(`🎉 ${selected.name} approved! Driver has been activated and received an approval email.`)
      } else {
        toast.success(`⚠️ Compliance marked as rejected. Correction email sent to ${selected.email || selected.name}.`)
      }
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update compliance status')
    } finally {
      setSaving(false)
    }
  }

  async function handleResendInvite(driver) {
    try {
      await api.post(`/admin/deliveries/drivers/${driver.id}/resend-invite`)
      toast.success(`📧 Fresh invitation email sent to ${driver.email}!`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend invite')
    }
  }

  async function handleSendPasswordResetLink() {
    if (!selected) return
    setUpdatingPassword(true)
    try {
      await api.post(`/admin/deliveries/drivers/${selected.id}/send-reset-link`)
      toast.success(`Password reset link sent to ${selected.email || selected.name}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send password reset link')
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
    <div className="container-fluid pb-5">
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <h5 className="mb-1 fw-bold text-dark font-display fs-20">Dispatch Drivers Management</h5>
          <p className="text-muted mb-0 fs-13">
            Fleet operations, automated driver invitation emails, compliance verification, and dispatch controls.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2.5">
          <ul className="breadcrumb mb-0 d-none d-sm-flex">
            <li className="breadcrumb-item">
              <Link to="/deliveries/active">Deliveries</Link>
            </li>
            <li className="breadcrumb-item active">Drivers &amp; Compliance</li>
          </ul>
          <button
            type="button"
            className="btn btn-success fw-bold px-3.5 py-2 d-flex align-items-center gap-2 shadow-sm text-white rounded-3"
            style={{ background: '#16a34a', borderColor: '#16a34a', fontSize: 13 }}
            onClick={() => openModal('add')}
          >
            <i className="ri-user-add-line fs-16" />
            <span>+ Onboard New Driver</span>
          </button>
        </div>
      </div>

      {/* Stat KPI Cards */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Fleet',
            value: stats.total,
            color: '#3b82f6',
            icon: 'ri-group-line',
            filter: 'all',
            subLeft: 'Fleet Registry',
            subRight: `${stats.total} Drivers`,
            glowClass: 'bg-card-glow-blue',
          },
          {
            label: 'Compliance Review',
            value: stats.pendingCompliance,
            color: '#d97706',
            icon: 'ri-file-shield-line',
            filter: 'onboarding_review',
            subLeft: 'Pending Documents',
            subRight: stats.pendingCompliance > 0 ? 'Review Needed' : 'All Clear',
            badgeBg: stats.pendingCompliance > 0 ? '#FEF3C7' : '#DCFCE7',
            badgeColor: stats.pendingCompliance > 0 ? '#D97706' : '#16A34A',
            glowClass: 'bg-card-glow-amber',
          },
          {
            label: 'Invited Couriers',
            value: stats.invited,
            color: '#2563eb',
            icon: 'ri-mail-send-line',
            filter: 'onboarding_invited',
            subLeft: 'Pending Sign-ups',
            subRight: 'Link Sent',
            glowClass: 'bg-card-glow-blue',
          },
          {
            label: 'Active Standby',
            value: stats.active,
            color: '#10b981',
            icon: 'ri-checkbox-circle-line',
            filter: 'active',
            subLeft: 'Online & Available',
            subRight: 'Ready for Orders',
            badgeBg: '#ECFDF5',
            badgeColor: '#059669',
            glowClass: 'bg-card-glow-green',
          },
          {
            label: 'On Delivery',
            value: stats.onDelivery,
            color: '#0ea5e9',
            icon: 'ri-truck-line',
            filter: 'on_delivery',
            subLeft: 'Live En Route',
            subRight: 'Active Dropoffs',
            badgeBg: '#E0F2FE',
            badgeColor: '#0284C7',
            glowClass: 'bg-card-glow-teal',
          },
          {
            label: 'Suspended',
            value: stats.suspended,
            color: '#ef4444',
            icon: 'ri-forbid-line',
            filter: 'suspended',
            subLeft: 'Restricted Couriers',
            subRight: stats.suspended > 0 ? 'Action Taken' : '0 Restricted',
            badgeBg: stats.suspended > 0 ? '#FEE2E2' : '#F3F4F6',
            badgeColor: stats.suspended > 0 ? '#DC2626' : '#6B7280',
            glowClass: 'bg-card-glow-amber',
          },
        ].map((c) => (
          <div key={c.label} className="col-12 col-sm-6 col-xl-2">
            <div
              className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${c.glowClass}`}
              style={{
                borderLeft: `4px solid ${c.color}`,
                cursor: c.filter ? 'pointer' : 'default',
                transform: filterStatus === c.filter ? 'translateY(-2px)' : 'none',
                boxShadow: filterStatus === c.filter ? `0 8px 20px ${c.color}25` : undefined,
              }}
              onClick={() => c.filter && setFilterStatus(c.filter)}
            >
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider" style={{ fontSize: 10 }}>
                    {c.label}
                  </span>
                  <span
                    className="kpi-icon-pill"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: c.color + '18',
                      color: c.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className={`${c.icon} fs-16`} />
                  </span>
                </div>
                <div className="fs-22 fw-bolder text-dark mb-1 font-display">{c.value}</div>
                <div className="d-flex align-items-center justify-content-between text-muted fs-11 mt-2 pt-2 border-top">
                  <span style={{ fontSize: 10 }}>{c.subLeft}</span>
                  {c.badgeBg ? (
                    <span
                      className="badge font-monospace text-xs px-1.5 py-0.5 rounded"
                      style={{ background: c.badgeBg, color: c.badgeColor, fontSize: 9 }}
                    >
                      {c.subRight}
                    </span>
                  ) : (
                    <strong className="text-dark font-monospace" style={{ fontSize: 10 }}>
                      {c.subRight}
                    </strong>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Actions */}
      <div className="card mb-3 border-0 shadow-sm">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center p-3">
          <div className="input-group" style={{ maxWidth: 300 }}>
            <span className="input-group-text bg-light text-muted">
              <i className="ri-search-line" />
            </span>
            <input
              className="form-control bg-light fs-13"
              placeholder="Search driver name, phone, zone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filterStatus !== 'all' && (
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setFilterStatus('all')}>
              <i className="ri-close-line me-1" />
              Clear Filter
            </button>
          )}

          <div className="ms-auto d-flex gap-2 align-items-center">
            <span className="text-muted small">
              {drivers.length} driver{drivers.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              className="btn btn-success px-3 py-2 fw-bold text-white fs-13 d-flex align-items-center gap-1.5 shadow-sm rounded-2"
              style={{ background: '#16a34a', borderColor: '#16a34a' }}
              onClick={() => openModal('add')}
            >
              <i className="ri-user-add-line fs-15" />
              <span>Onboard New Driver</span>
            </button>
          </div>
        </div>

        {/* Status tabs */}
        <div className="border-top px-3" style={{ overflowX: 'auto' }}>
          <div className="d-flex" style={{ whiteSpace: 'nowrap' }}>
            {[
              { key: 'all', label: 'All Drivers' },
              { key: 'onboarding_review', label: `⚠️ Review Compliance (${stats.pendingCompliance})` },
              { key: 'onboarding_invited', label: `📨 Invited (${stats.invited})` },
              { key: 'active', label: 'Active' },
              { key: 'on_delivery', label: 'On Delivery' },
              { key: 'off_duty', label: 'Off Duty' },
              { key: 'suspended', label: 'Suspended' },
            ].map((t) => (
              <button
                key={t.key}
                className="btn btn-sm border-0 rounded-0 py-2.5 px-3 fs-13"
                style={{
                  borderBottom: filterStatus === t.key ? '3px solid #059669' : '3px solid transparent',
                  color: filterStatus === t.key ? '#059669' : '#6b7280',
                  fontWeight: filterStatus === t.key ? 700 : 500,
                  background: 'transparent',
                }}
                onClick={() => setFilterStatus(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr className="text-muted fs-11 text-uppercase fw-bold">
                <th className="ps-4">Driver Profile</th>
                <th>Contact</th>
                <th>Compliance Status</th>
                <th>Vehicle &amp; Zone</th>
                <th>Deliveries</th>
                <th>Rating</th>
                <th>Earnings</th>
                <th>Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-5">
                    <div className="spinner-border spinner-border-sm text-emerald me-2"></div>
                    Loading driver fleet &amp; compliance…
                  </td>
                </tr>
              )}
              {!loading && drivers.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-5">
                    <div className="fs-24 mb-1">🛵</div>
                    <div className="fw-bold text-dark">No drivers found</div>
                    <small>Try adjusting your search query or filter tab.</small>
                  </td>
                </tr>
              )}
              {!loading &&
                drivers.map((driver) => {
                  const cfg = STATUS_CFG[driver.status] || STATUS_CFG.active
                  const onbCfg =
                    ONBOARDING_STATUS_CFG[driver.onboarding_status] || ONBOARDING_STATUS_CFG.approved
                  const isPendingReview = driver.onboarding_status === 'documents_submitted'
                  const isInvited = driver.onboarding_status === 'invited'

                  return (
                    <tr key={driver.id} className={isPendingReview ? 'table-warning' : ''}>
                      {/* Driver Name & Joined */}
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-3">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                            style={{
                              width: 40,
                              height: 40,
                              background: cfg.color + '20',
                              color: cfg.color,
                              fontSize: 13,
                            }}
                          >
                            {driver.name
                              ? driver.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                              : 'DR'}
                          </div>
                          <div>
                            <div className="fw-bold text-dark fs-13">{driver.name}</div>
                            <div className="text-muted fs-11">
                              {driver.joined_date ? `Joined ${driver.joined_date.slice(0, 10)}` : 'Invited Candidate'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td>
                        <div className="fs-13 fw-semibold font-monospace">{driver.phone}</div>
                        <div className="text-muted fs-11">{driver.email || '—'}</div>
                      </td>

                      {/* Compliance Status */}
                      <td>
                        <div className="d-flex flex-column gap-1 align-items-start">
                          <span
                            className="badge rounded-pill px-2.5 py-1 text-xs fw-bold d-inline-flex align-items-center gap-1"
                            style={{ background: onbCfg.bg, color: onbCfg.color }}
                          >
                            <i className={onbCfg.icon} />
                            {onbCfg.label}
                          </span>

                          {isPendingReview && (
                            <button
                              className="btn btn-warning btn-sm py-0.5 px-2 text-xs fw-bold rounded-pill mt-0.5 shadow-sm"
                              onClick={() => openModal('compliance', driver)}
                            >
                              <i className="ri-shield-check-line me-1"></i> Verify Docs Now
                            </button>
                          )}
                          {isInvited && (
                            <button
                              className="btn btn-outline-primary btn-sm py-0.5 px-2 text-xs fw-semibold rounded-pill mt-0.5"
                              onClick={() => handleResendInvite(driver)}
                              title="Resend onboarding email"
                            >
                              <i className="ri-mail-send-line me-1"></i> Resend Email
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Vehicle & Zone */}
                      <td>
                        <div className="fs-13 text-dark fw-medium">
                          {driver.vehicle_type ? driver.vehicle_type.replace(/_/g, ' ') : 'Motorcycle'} ·{' '}
                          <span className="font-monospace text-muted">{driver.vehicle_plate || 'No Plate'}</span>
                        </div>
                        <div className="text-muted fs-11">
                          <i className="ri-map-pin-2-line text-emerald me-1"></i>
                          {driver.zone || 'All Zones (Auto-Dispatch)'}
                        </div>
                      </td>

                      {/* Deliveries */}
                      <td className="fw-bold font-monospace fs-13">{driver.total_deliveries || 0}</td>

                      {/* Rating */}
                      <td>
                        <StarRating rating={driver.rating} />
                      </td>

                      {/* Earnings */}
                      <td className="fw-bold font-monospace text-emerald fs-13">{fmt(driver.earnings)}</td>

                      {/* Status */}
                      <td>
                        <span
                          className="badge rounded-pill px-2.5 py-1 text-xs fw-bold"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          <i className={`${cfg.icon} me-1`} />
                          {cfg.label}
                        </span>
                        {driver.current_order && (
                          <div className="text-primary fw-semibold fs-10 mt-1">Order #{driver.current_order}</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-end pe-4">
                        <div className="d-flex gap-1.5 justify-content-end">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            title="View Full Profile & Compliance"
                            onClick={() => openModal('profile', driver)}
                          >
                            <i className="ri-eye-line" />
                          </button>

                          <button
                            className="btn btn-sm btn-outline-primary"
                            title="Edit Driver Details"
                            onClick={() => openModal('edit', driver)}
                          >
                            <i className="ri-edit-line" />
                          </button>

                          {driver.status === 'suspended' ? (
                            <button
                              className="btn btn-sm btn-outline-success"
                              title="Reinstate Driver"
                              onClick={() => activateDriver(driver)}
                            >
                              <i className="ri-checkbox-circle-line" />
                            </button>
                          ) : (
                            driver.status !== 'on_delivery' && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                title="Suspend Driver"
                                onClick={() => openModal('suspend', driver)}
                              >
                                <i className="ri-forbid-line" />
                              </button>
                            )
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
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          {/* ── 1. DRIVER COMPLIANCE REVIEW MODAL ────────────────── */}
          {activeModal === 'compliance' && selected && (
            <div
              style={{
                background: '#fff',
                borderRadius: 20,
                width: '100%',
                maxWidth: 780,
                maxHeight: '92vh',
                overflowY: 'auto',
              }}
              className="shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-bottom bg-light-subtle d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold fs-18"
                    style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}
                  >
                    🛡️
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold text-dark font-display">
                      Driver Compliance Verification &amp; Document Audit
                    </h5>
                    <div className="text-muted fs-12">
                      Review submitted credentials for <strong>{selected.name}</strong> ({selected.phone})
                    </div>
                  </div>
                </div>
                <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={closeModal}>
                  <i className="ri-close-line" />
                </button>
              </div>

              <div className="p-4">
                {/* Candidate Information Card */}
                <div className="bg-light p-3.5 rounded-3 mb-4 border">
                  <div className="row g-3 fs-13">
                    <div className="col-sm-6">
                      <span className="text-muted d-block fs-11 text-uppercase fw-bold">Full Legal Name</span>
                      <strong className="text-dark">{selected.name}</strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted d-block fs-11 text-uppercase fw-bold">Phone (Login ID)</span>
                      <strong className="text-dark font-monospace">{selected.phone}</strong>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted d-block fs-11 text-uppercase fw-bold">Email Address</span>
                      <span className="text-dark">{selected.email || '—'}</span>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted d-block fs-11 text-uppercase fw-bold">National ID (NIN)</span>
                      <strong className="text-dark font-monospace">{selected.nin_number || 'Pending'}</strong>
                    </div>
                    <div className="col-12">
                      <span className="text-muted d-block fs-11 text-uppercase fw-bold">Residential Address</span>
                      <span className="text-dark">{selected.address || '—'}</span>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted d-block fs-11 text-uppercase fw-bold">Next of Kin Contact</span>
                      <span className="text-dark">
                        {selected.emergency_contact_name || '—'}{' '}
                        {selected.emergency_contact_phone && `(${selected.emergency_contact_phone})`}
                      </span>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted d-block fs-11 text-uppercase fw-bold">Guarantor Information</span>
                      <span className="text-dark">
                        {selected.guarantor_name || '—'}{' '}
                        {selected.guarantor_phone && `(${selected.guarantor_phone})`}
                      </span>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted d-block fs-11 text-uppercase fw-bold">Vehicle &amp; License</span>
                      <span className="text-dark font-monospace">
                        {selected.vehicle_plate || 'No Plate'} · DL: {selected.license_number || 'Pending'}
                      </span>
                    </div>
                    <div className="col-sm-6">
                      <span className="text-muted d-block fs-11 text-uppercase fw-bold">Commission Payout Account</span>
                      <span className="text-dark font-monospace">
                        {selected.bank_name || 'Bank'} — {selected.account_number || '—'} ({selected.account_name || '—'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Document Scans & Uploads Showcase */}
                <h6 className="fw-bold text-dark font-display mb-3">
                  <i className="ri-attachment-line text-emerald me-1"></i> Submitted Compliance Documents
                </h6>
                <div className="row g-3 mb-4">
                  {[
                    { key: 'drivers_license', title: "Driver's License", icon: '🪪' },
                    { key: 'nin_slip', title: 'National ID / NIN Slip', icon: '📜' },
                    { key: 'vehicle_registration', title: 'Vehicle Registration', icon: '🛵' },
                    { key: 'passport_photo', title: 'Passport Photo', icon: '📸' },
                    { key: 'guarantor_form', title: 'Guarantor Form / Letter', icon: '📝' },
                  ].map((doc) => {
                    const docUrl = selected.documents?.[doc.key]
                    return (
                      <div key={doc.key} className="col-sm-6 col-md-4">
                        <div className="border rounded-3 p-3 text-center h-100 bg-light d-flex flex-column justify-content-between">
                          <div>
                            <div className="fs-24 mb-1">{doc.icon}</div>
                            <div className="fw-bold fs-12 text-dark mb-2">{doc.title}</div>
                          </div>
                          {docUrl ? (
                            <div>
                              <div
                                className="rounded overflow-hidden mb-2 border bg-white"
                                style={{ height: 90, cursor: 'pointer' }}
                                onClick={() => setViewingDocument({ title: doc.title, url: docUrl })}
                              >
                                <img
                                  src={docUrl}
                                  alt={doc.title}
                                  className="w-100 h-100 object-fit-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none'
                                    e.target.parentElement.innerHTML = '<span class="text-xs text-muted p-2 d-block">📄 PDF / File Attached</span>'
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary w-100 fs-11 fw-semibold"
                                onClick={() => setViewingDocument({ title: doc.title, url: docUrl })}
                              >
                                <i className="ri-zoom-in-line me-1"></i> View Full Scan
                              </button>
                            </div>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary py-2 fs-11">
                              Not Provided
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Review Notes / Reason if Rejecting */}
                <div className="mb-4">
                  <label className="form-label fw-bold text-dark fs-12">
                    Compliance Review Remarks / Rejection Feedback (Optional if approving, required if requesting changes)
                  </label>
                  <textarea
                    className="form-control fs-13"
                    rows={2}
                    placeholder="e.g. Please re-upload a clearer image of your driver's license..."
                    value={complianceRejectNotes}
                    onChange={(e) => setComplianceRejectNotes(e.target.value)}
                  />
                </div>

                {/* Action Buttons */}
                <div className="d-flex gap-3 pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-danger flex-fill py-2.5 fw-bold fs-13"
                    disabled={saving}
                    onClick={() => handleComplianceDecision('reject')}
                  >
                    <i className="ri-close-circle-line me-1"></i> Request Document Re-upload
                  </button>

                  <button
                    type="button"
                    className="btn btn-emerald-solid flex-fill py-2.5 fw-bold fs-13 text-white shadow-sm"
                    disabled={saving}
                    onClick={() => handleComplianceDecision('approve')}
                  >
                    <i className="ri-checkbox-circle-line me-1"></i> Approve Compliance &amp; Activate Driver
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── DOCUMENT VIEWER LIGHTBOX MODAL ────────────────── */}
          {viewingDocument && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.85)',
                zIndex: 1100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              }}
              onClick={() => setViewingDocument(null)}
            >
              <div
                style={{ background: '#fff', borderRadius: 16, maxWidth: 840, width: '100%', maxHeight: '90vh' }}
                className="overflow-hidden p-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="d-flex justify-content-between align-items-center mb-2 px-2">
                  <strong className="text-dark">{viewingDocument.title}</strong>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setViewingDocument(null)}>
                    ✕ Close
                  </button>
                </div>
                <div className="text-center bg-dark rounded p-2" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                  <img src={viewingDocument.url} alt={viewingDocument.title} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
                </div>
              </div>
            </div>
          )}

          {/* ── 2. DRIVER PROFILE & CREDENTIALS MODAL ─────────── */}
          {activeModal === 'profile' && selected && (() => {
            const cfg = STATUS_CFG[selected.status] || STATUS_CFG.active
            const onbCfg =
              ONBOARDING_STATUS_CFG[selected.onboarding_status] || ONBOARDING_STATUS_CFG.approved
            const successRate = Number(selected.success_rate || 0)

            return (
              <div
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  width: '100%',
                  maxWidth: 600,
                  maxHeight: '90vh',
                  overflowY: 'auto',
                }}
                className="shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header band */}
                <div style={{ background: '#1e293b', padding: '24px 28px', color: '#fff' }}>
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold fs-18"
                      style={{
                        width: 56,
                        height: 56,
                        background: cfg.color + '30',
                        border: `2px solid ${cfg.color}`,
                        color: cfg.color,
                      }}
                    >
                      {selected.name
                        ? selected.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                        : 'DR'}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold fs-18">{selected.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        {selected.phone} · {selected.email || 'No email recorded'}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        {selected.vehicle_type || 'Motorcycle'} · {selected.vehicle_plate || 'No Plate'}
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="badge mb-1 d-block" style={{ background: cfg.bg, color: cfg.color, fontSize: 11 }}>
                        <i className={`${cfg.icon} me-1`} />
                        {cfg.label}
                      </span>
                      <span
                        className="badge"
                        style={{ background: onbCfg.bg, color: onbCfg.color, fontSize: 10 }}
                      >
                        {onbCfg.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {/* KPI row */}
                  <div className="row g-3 mb-4">
                    {[
                      { label: 'Total Deliveries', value: selected.total_deliveries || 0, color: '#6366f1' },
                      {
                        label: 'Success Rate',
                        value: `${successRate}%`,
                        color: successRate >= 95 ? '#22c55e' : successRate >= 85 ? '#f59e0b' : '#ef4444',
                      },
                      { label: 'Total Earnings', value: fmt(selected.earnings), color: '#10b981' },
                    ].map((k) => (
                      <div key={k.label} className="col-4">
                        <div className="border rounded-3 p-3 text-center bg-light">
                          <div className="fw-bold fs-18" style={{ color: k.color }}>
                            {k.value}
                          </div>
                          <div className="text-muted fs-11">{k.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rating */}
                  <div className="d-flex align-items-center gap-2 mb-4">
                    <StarRating rating={selected.rating} />
                    <span className="text-muted small">({selected.total_deliveries || 0} customer reviews)</span>
                  </div>

                  {/* Compliance documents trigger */}
                  <div className="p-3 rounded-3 border bg-light-subtle mb-3 d-flex justify-content-between align-items-center">
                    <div>
                      <strong className="fs-13 text-dark d-block">Compliance &amp; Identity Documentation</strong>
                      <span className="text-muted fs-11">
                        Status: <strong style={{ color: onbCfg.color }}>{onbCfg.label}</strong>
                      </span>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-primary fw-bold"
                      onClick={() => {
                        closeModal()
                        setTimeout(() => openModal('compliance', selected), 100)
                      }}
                    >
                      <i className="ri-shield-check-line me-1"></i> View Compliance Dossier
                    </button>
                  </div>

                  {/* Driver App Credentials & Reset Link */}
                  <div className="border rounded-3 p-3 mb-3 bg-light-subtle">
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <span className="fw-bold small text-dark">
                        <i className="ri-shield-keyhole-line me-1 text-primary" />
                        Driver Password &amp; Account Security
                      </span>
                      <span className="badge bg-success-subtle text-success fs-xs">Self-Service Protected</span>
                    </div>
                    <p className="text-muted mb-2.5" style={{ fontSize: 11, lineHeight: 1.5 }}>
                      For privacy and security, driver passwords cannot be viewed or typed by administrators. You can trigger an official password reset link directly to the driver's email.
                    </p>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary w-100 fw-bold d-flex align-items-center justify-content-center gap-1.5 py-1.5"
                      disabled={!selected.email || updatingPassword}
                      onClick={handleSendPasswordResetLink}
                    >
                      <i className="ri-mail-send-line" />
                      <span>{updatingPassword ? 'Sending Reset Link…' : `Send Password Reset Email to ${selected.email || 'Driver'}`}</span>
                    </button>
                  </div>

                  <div className="d-flex gap-2 pt-2">
                    <button
                      className="btn btn-outline-primary btn-sm fw-semibold"
                      onClick={() => {
                        closeModal()
                        setTimeout(() => openModal('edit', selected), 100)
                      }}
                    >
                      <i className="ri-edit-line me-1" />
                      Edit Profile
                    </button>
                    {selected.status !== 'suspended' && selected.status !== 'on_delivery' && (
                      <button
                        className="btn btn-outline-danger btn-sm fw-semibold"
                        onClick={() => {
                          closeModal()
                          setTimeout(() => openModal('suspend', selected), 100)
                        }}
                      >
                        <i className="ri-forbid-line me-1" />
                        Suspend
                      </button>
                    )}
                    {selected.status === 'suspended' && (
                      <button
                        className="btn btn-outline-success btn-sm fw-semibold"
                        onClick={() => {
                          activateDriver(selected)
                          closeModal()
                        }}
                      >
                        <i className="ri-checkbox-circle-line me-1" />
                        Reinstate
                      </button>
                    )}
                    <button className="btn btn-outline-secondary btn-sm ms-auto" onClick={closeModal}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── 3. ONBOARD / ADD DRIVER MODAL (WITH EMAIL INVITE) ─── */}
          {(activeModal === 'add' || activeModal === 'edit') && (
            <div
              style={{
                background: '#fff',
                borderRadius: 20,
                width: '100%',
                maxWidth: 620,
                maxHeight: '92vh',
                overflowY: 'auto',
              }}
              className="shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom bg-light-subtle">
                <div>
                  <h5 className="mb-0 fw-bold text-dark font-display">
                    {isEditing ? 'Edit Dispatch Driver Profile' : '🛵 Onboard Dispatch Driver'}
                  </h5>
                  <p className="text-muted small mb-0">
                    {isEditing
                      ? 'Update fleet vehicle and contact details.'
                      : 'Send driver compliance onboarding invitation email or register directly.'}
                  </p>
                </div>
                <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={closeModal}>
                  <i className="ri-close-line" />
                </button>
              </div>

              <div className="p-4">
                {!isEditing && (
                  <div className="mb-4 bg-light p-2 rounded-3 d-flex gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm flex-fill fw-bold py-2 ${
                        form.onboard_mode === 'invite' ? 'btn-primary shadow-sm' : 'btn-light text-muted'
                      }`}
                      onClick={() => setField('onboard_mode', 'invite')}
                    >
                      <i className="ri-mail-send-line me-1.5"></i> Send Email Onboarding Invite (Recommended)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm flex-fill fw-bold py-2 ${
                        form.onboard_mode === 'direct' ? 'btn-primary shadow-sm' : 'btn-light text-muted'
                      }`}
                      onClick={() => setField('onboard_mode', 'direct')}
                    >
                      <i className="ri-user-add-line me-1.5"></i> Direct In-Office Registration
                    </button>
                  </div>
                )}

                <div className="row g-3">
                  <div className="col-12">
                    <div className="fw-bold small text-uppercase tracking-wider text-muted mb-1">
                      1. Driver Identity &amp; Contact
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Full Legal Name *</label>
                    <input
                      className="form-control"
                      placeholder="e.g. Samuel Okafor"
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Phone Number (Login ID) *</label>
                    <input
                      className="form-control font-monospace"
                      placeholder="e.g. 08012345678"
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">
                      Email Address {form.onboard_mode === 'invite' ? '*' : '(Optional)'}
                    </label>
                    <input
                      className="form-control"
                      type="email"
                      placeholder="e.g. samuel.okafor@gmail.com"
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Emergency Contact Phone</label>
                    <input
                      className="form-control font-monospace"
                      placeholder="e.g. 08098765432"
                      value={form.emergency_contact}
                      onChange={(e) => setField('emergency_contact', e.target.value)}
                    />
                  </div>

                  {form.onboard_mode === 'direct' && !isEditing && (
                    <div className="col-12 bg-primary-subtle p-3 rounded-3">
                      <label className="form-label fw-bold small text-primary mb-1">
                        <i className="ri-lock-password-line me-1" />
                        Driver App Login Password / PIN
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control font-monospace"
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
                    <select
                      className="form-select"
                      value={form.vehicle_type}
                      onChange={(e) => setField('vehicle_type', e.target.value)}
                    >
                      {VEHICLE_TYPES.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Vehicle Plate Number</label>
                    <input
                      className="form-control font-monospace uppercase"
                      placeholder="e.g. ABA-492-XA"
                      value={form.vehicle_plate}
                      onChange={(e) => setField('vehicle_plate', e.target.value.toUpperCase())}
                    />
                  </div>

                  <div className="col-12 mt-3">
                    <div className="fw-bold small text-uppercase tracking-wider text-muted mb-1">
                      3. Dispatch Zone &amp; Remuneration
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Primary Delivery Zone</label>
                    <select
                      className="form-select"
                      value={form.zone_id}
                      onChange={(e) => setField('zone_id', e.target.value)}
                    >
                      <option value="">— Auto-Dispatch (All Zones) —</option>
                      {zones.map((z) => (
                        <option key={z.zone_id} value={z.zone_id}>
                          {z.zone_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Commission Per Delivery (₦)</label>
                    <input
                      className="form-control font-monospace"
                      type="number"
                      placeholder="500"
                      value={form.commission_per_delivery}
                      onChange={(e) => setField('commission_per_delivery', e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium small">Onboarding Notes (optional)</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="NIN verification, guarantor notes, physical inspection notes..."
                      value={form.notes}
                      onChange={(e) => setField('notes', e.target.value)}
                    />
                  </div>
                </div>

                <div className="d-flex gap-2 mt-4 pt-2 border-top">
                  <button className="btn btn-outline-secondary flex-fill py-2" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-emerald-solid flex-fill fw-bold py-2.5 text-white"
                    onClick={saveDriver}
                    disabled={!form.name || !form.phone || (form.onboard_mode === 'invite' && !form.email) || saving}
                  >
                    <i className={`${isEditing ? 'ri-save-line' : form.onboard_mode === 'invite' ? 'ri-mail-send-line' : 'ri-user-add-line'} me-1.5`} />
                    {saving
                      ? 'Processing…'
                      : isEditing
                      ? 'Save Changes'
                      : form.onboard_mode === 'invite'
                      ? 'Send Onboarding Email Invitation'
                      : 'Complete Direct Registration'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 4. ONBOARD SUCCESS MODAL ───────────────────────── */}
          {activeModal === 'onboard_success' && onboardedCredentials && (
            <div
              style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480 }}
              className="shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-emerald-solid text-white p-4 text-center">
                <div
                  className="rounded-circle bg-white text-success mx-auto d-flex align-items-center justify-content-center mb-2"
                  style={{ width: 48, height: 48, fontSize: 24 }}
                >
                  <i className="ri-checkbox-circle-fill" />
                </div>
                <h5 className="fw-bold mb-1">
                  {onboardedCredentials.mode === 'invite' ? 'Invitation Sent Successfully!' : 'Driver Onboarded!'}
                </h5>
                <p className="small mb-0 opacity-90">
                  {onboardedCredentials.mode === 'invite'
                    ? `An onboarding & compliance link has been emailed to ${onboardedCredentials.email}.`
                    : 'Credentials generated for Driver App.'}
                </p>
              </div>

              <div className="p-4">
                <div className="border rounded-3 p-3 bg-light mb-3">
                  <div className="d-flex justify-content-between mb-1.5 small">
                    <span className="text-muted">Driver Name:</span>
                    <strong className="text-dark">{onboardedCredentials.name}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1.5 small">
                    <span className="text-muted">Registered Phone:</span>
                    <strong className="text-primary font-monospace">{onboardedCredentials.phone}</strong>
                  </div>
                  {onboardedCredentials.mode === 'invite' ? (
                    <div className="d-flex justify-content-between mb-1.5 small">
                      <span className="text-muted">Temporary PIN:</span>
                      <strong className="text-dark font-monospace">{onboardedCredentials.tempPin}</strong>
                    </div>
                  ) : (
                    <div className="d-flex justify-content-between mb-1.5 small">
                      <span className="text-muted">Password / PIN:</span>
                      <strong className="text-danger font-monospace">{onboardedCredentials.password}</strong>
                    </div>
                  )}
                </div>

                <div className="d-flex flex-column gap-2">
                  {onboardedCredentials.inviteUrl && (
                    <button
                      type="button"
                      className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-1.5 py-2"
                      onClick={() => {
                        navigator.clipboard.writeText(onboardedCredentials.inviteUrl)
                        toast.success('📋 Driver onboarding link copied!')
                      }}
                    >
                      <i className="ri-file-copy-line" />
                      <span>Copy Onboarding Link</span>
                    </button>
                  )}

                  <button className="btn btn-secondary mt-1 py-2 fw-bold" onClick={closeModal}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 5. SUSPEND DRIVER MODAL ───────────────────────── */}
          {activeModal === 'suspend' && selected && (
            <div
              style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420 }}
              className="shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
                <h5 className="mb-0 text-danger fw-bold font-display">
                  <i className="ri-forbid-line me-2" />
                  Suspend Driver
                </h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}>
                  <i className="ri-close-line" />
                </button>
              </div>
              <div className="p-4">
                <div className="alert alert-warning mb-3 small">
                  Suspending <strong>{selected.name}</strong> will temporarily prevent them from receiving delivery
                  dispatches.
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium small">Reason for Suspension *</label>
                  <textarea
                    className="form-control fs-13"
                    rows={3}
                    placeholder="e.g. Multiple customer complaints, delivery fraud, missing items..."
                    value={suspendNote}
                    onChange={(e) => setSuspendNote(e.target.value)}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>
                    Cancel
                  </button>
                  <button className="btn btn-danger flex-fill fw-bold" onClick={suspendDriver} disabled={!suspendNote}>
                    <i className="ri-forbid-line me-1" />
                    Suspend Driver
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
