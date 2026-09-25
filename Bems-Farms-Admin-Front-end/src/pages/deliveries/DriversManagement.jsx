import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useRealtimeEvent } from '../../context/RealtimeContext'

const STATUS_CFG = {
  active:      { label: 'Online & Ready', color: '#16a34a', bg: '#dcfce7', icon: 'ri-signal-tower-fill' },
  no_signal:   { label: 'No Signal / Data Off', color: '#d97706', bg: '#fef3c7', icon: 'ri-wifi-off-line' },
  on_delivery: { label: 'On Delivery', color: '#3b82f6', bg: '#dbeafe', icon: 'ri-truck-line'         },
  off_duty:    { label: 'Off Duty',    color: '#6b7280', bg: '#f3f4f6', icon: 'ri-moon-line'             },
  pending:     { label: 'Pending Review', color: '#d97706', bg: '#fef3c7', icon: 'ri-time-line'          },
  suspended:   { label: 'Suspended',   color: '#ef4444', bg: '#fee2e2', icon: 'ri-forbid-line'           },
}

const ONBOARDING_STATUS_CFG = {
  pending_verification: {
    label: 'Awaiting Verification (App Submission)',
    color: '#d97706',
    bg: '#fef3c7',
    icon: 'ri-time-line',
  },
  documents_submitted: {
    label: 'Documents Submitted (Review Needed)',
    color: '#d97706',
    bg: '#fef3c7',
    icon: 'ri-file-text-line',
  },
  verified: {
    label: 'Verified & Active',
    color: '#16a34a',
    bg: '#dcfce7',
    icon: 'ri-shield-check-line',
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

const PAYOUT_STATUS_CFG = {
  pending: {
    label: 'Pending Review',
    color: '#d97706',
    bg: '#fef3c7',
    icon: 'ri-time-line',
  },
  approved: {
    label: 'Approved (Queued)',
    color: '#2563eb',
    bg: '#dbeafe',
    icon: 'ri-checkbox-circle-line',
  },
  paid: {
    label: 'Disbursed / Paid',
    color: '#16a34a',
    bg: '#dcfce7',
    icon: 'ri-money-dollar-circle-line',
  },
  rejected: {
    label: 'Rejected',
    color: '#dc2626',
    bg: '#fee2e2',
    icon: 'ri-close-circle-line',
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
  onboard_mode: 'direct', // 'direct'
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
  const [tabMode, setTabMode] = useState('fleet') // 'fleet' | 'payouts'
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
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Driver Payouts & Wallets State
  const [payouts, setPayouts] = useState([])
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutFilter, setPayoutFilter] = useState('all')
  const [payoutSearch, setPayoutSearch] = useState('')
  const [payoutActionModal, setPayoutActionModal] = useState(null) // 'approve' | 'reject'
  const [targetPayout, setTargetPayout] = useState(null)
  const [payoutDisburseNote, setPayoutDisburseNote] = useState('')
  const [payoutRejectReason, setPayoutRejectReason] = useState('')

  const load = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
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
        allDrivers = allDrivers.filter((d) => d.status === 'pending' || d.onboarding_status === 'documents_submitted' || d.onboarding_status === 'pending_verification')
      }
      setDrivers(allDrivers)
      setZones(zoneRes.data.zones || [])
    } catch {
      toast.error('Failed to load drivers')
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [search, filterStatus])

  // Live auto-refresh when drivers send heartbeat, GPS updates, or assignments change
  useRealtimeEvent('driver:telemetry', () => load(true))
  useRealtimeEvent('driver:location', () => load(true))
  useRealtimeEvent('delivery:updated', () => load(true))
  useRealtimeEvent('emergency:sos', () => load(true))
  useRealtimeEvent('window:focused', () => load(true))

  const loadPayouts = useCallback(async () => {
    setPayoutLoading(true)
    try {
      const res = await api.get('/admin/deliveries/payouts', {
        params: {
          status: payoutFilter !== 'all' ? payoutFilter : undefined,
        },
      })
      setPayouts(res.data.payouts || [])
    } catch {
      toast.error('Failed to load driver payout requests')
    } finally {
      setPayoutLoading(false)
    }
  }, [payoutFilter])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    if (tabMode === 'payouts') {
      loadPayouts()
    }
  }, [tabMode, loadPayouts])

  const openModal = (type, driver = null) => {
    setSelected(driver)
    setActiveModal(type)
    setSuspendNote('')
    setComplianceRejectNotes('')
    setViewingDocument(null)

    if (type === 'add') {
      setForm({
        ...BLANK_FORM,
        password: Math.floor(100000 + Math.random() * 900000).toString(),
        onboard_mode: 'direct',
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
    setPayoutActionModal(null)
    setTargetPayout(null)
    setPayoutDisburseNote('')
    setPayoutRejectReason('')
  }

  const setField = (f, v) => setForm((p) => ({ ...p, [f]: v }))

  const stats = useMemo(
    () => ({
      total: drivers.length,
      active: drivers.filter((d) => d.status === 'active').length,
      noSignal: drivers.filter((d) => d.status === 'no_signal').length,
      onDelivery: drivers.filter((d) => d.status === 'on_delivery').length,
      offDuty: drivers.filter((d) => d.status === 'off_duty').length,
      suspended: drivers.filter((d) => d.status === 'suspended').length,
      pendingCompliance: drivers.filter((d) => d.status === 'pending' || d.onboarding_status === 'documents_submitted' || d.onboarding_status === 'pending_verification').length,
      totalDeliveries: drivers.reduce((s, d) => s + Number(d.total_deliveries || 0), 0),
      totalEarnings: drivers.reduce((s, d) => s + Number(d.earnings || d.total_earnings || 0), 0),
    }),
    [drivers]
  )

  const payoutStats = useMemo(() => {
    const totalAmount = payouts.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const pendingAmount = payouts
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const paidAmount = payouts
      .filter((p) => p.status === 'paid' || p.status === 'approved')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const pendingCount = payouts.filter((p) => p.status === 'pending').length
    const paidCount = payouts.filter((p) => p.status === 'paid').length
    return { totalAmount, pendingAmount, paidAmount, pendingCount, paidCount, count: payouts.length }
  }, [payouts])

  const filteredPayouts = useMemo(() => {
    if (!payoutSearch.trim()) return payouts
    const q = payoutSearch.toLowerCase().trim()
    return payouts.filter(
      (p) =>
        (p.driver_name || '').toLowerCase().includes(q) ||
        (p.driver_phone || '').toLowerCase().includes(q) ||
        (p.payout_ref || '').toLowerCase().includes(q) ||
        (p.bank_name || '').toLowerCase().includes(q) ||
        (p.account_number || '').toLowerCase().includes(q)
    )
  }, [payouts, payoutSearch])

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

  async function deleteDriver() {
    if (!selected) return
    setDeleting(true)
    try {
      const res = await api.delete(`/admin/deliveries/drivers/${selected.id}`)
      toast.success(res.data?.message || 'Driver deleted successfully')
      closeModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete driver')
    } finally {
      setDeleting(false)
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

  async function handleProcessPayout(status) {
    if (!targetPayout) return
    if (status === 'rejected' && !payoutRejectReason.trim()) {
      toast.error('Please enter a rejection reason')
      return
    }
    setSaving(true)
    try {
      await api.patch(`/admin/deliveries/payouts/${targetPayout.id}`, {
        status,
        rejection_reason: status === 'rejected' ? payoutRejectReason.trim() : undefined,
        notes: status === 'paid' ? payoutDisburseNote.trim() : undefined,
      })
      toast.success(status === 'paid' ? '💰 Payout marked as Paid & Disbursed!' : '⚠️ Payout request rejected')
      closeModal()
      loadPayouts()
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update payout')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-fluid pb-5">
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
        <div>
          <h5 className="mb-1 fw-bold text-dark font-display fs-20">Dispatch Fleet &amp; Driver Wallets</h5>
          <p className="text-muted mb-0 fs-13">
            Review self-service driver registrations, monitor live courier compliance, track earnings, and disburse bank payouts.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2.5">
          <ul className="breadcrumb mb-0 d-none d-sm-flex">
            <li className="breadcrumb-item">
              <Link to="/deliveries/active">Deliveries</Link>
            </li>
            <li className="breadcrumb-item active">
              {tabMode === 'fleet' ? 'Drivers & Verification' : 'Wallets & Payouts'}
            </li>
          </ul>
          {tabMode === 'fleet' && stats.pendingCompliance > 0 && (
            <button
              type="button"
              className="btn btn-warning fw-bold px-3.5 py-2 d-flex align-items-center gap-2 shadow-sm text-dark rounded-3"
              style={{ fontSize: 13 }}
              onClick={() => setFilterStatus('onboarding_review')}
            >
              <i className="ri-shield-check-line fs-16" />
              <span>⚠️ Review Verification ({stats.pendingCompliance})</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Mode Tabs (Fleet vs Payouts) */}
      <div className="d-flex align-items-center gap-2 mb-4 bg-light p-1.5 rounded-3 border" style={{ maxWidth: 480 }}>
        <button
          type="button"
          className={`btn btn-sm flex-fill py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-2 transition-all ${
            tabMode === 'fleet' ? 'btn-success text-white shadow-sm' : 'btn-light text-dark'
          }`}
          style={{
            backgroundColor: tabMode === 'fleet' ? '#16a34a' : '#f8fafc',
            color: tabMode === 'fleet' ? '#ffffff' : '#334155',
            border: tabMode === 'fleet' ? '1px solid #15803d' : '1px solid #e2e8f0',
          }}
          onClick={() => setTabMode('fleet')}
        >
          <i className="ri-truck-line fs-16" />
          <span>🚚 Fleet Directory ({drivers.length})</span>
          {stats.pendingCompliance > 0 && (
            <span className="badge rounded-pill px-2 py-0.5 fs-10" style={{ background: '#fef3c7', color: '#d97706' }}>
              {stats.pendingCompliance} pending
            </span>
          )}
        </button>
        <button
          type="button"
          className={`btn btn-sm flex-fill py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-2 transition-all ${
            tabMode === 'payouts' ? 'btn-primary text-white shadow-sm' : 'btn-light text-dark'
          }`}
          style={{
            backgroundColor: tabMode === 'payouts' ? '#2563eb' : '#f8fafc',
            color: tabMode === 'payouts' ? '#ffffff' : '#334155',
            border: tabMode === 'payouts' ? '1px solid #1d4ed8' : '1px solid #e2e8f0',
          }}
          onClick={() => setTabMode('payouts')}
        >
          <i className="ri-wallet-3-line fs-16" />
          <span>💳 Driver Wallets &amp; Payouts</span>
          {payoutStats.pendingCount > 0 && (
            <span className="badge bg-danger rounded-pill px-2 py-0.5 fs-10">{payoutStats.pendingCount}</span>
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          VIEW 1: DRIVER FLEET DIRECTORY
      ══════════════════════════════════════════════════════════════ */}
      {tabMode === 'fleet' && (
        <>
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
                label: 'Online & Ready',
                value: stats.active,
                color: '#16a34a',
                icon: 'ri-signal-tower-fill',
                filter: 'active',
                subLeft: 'Live Heartbeat (<5m)',
                subRight: 'Auto-Dispatch On',
                badgeBg: '#DCFCE7',
                badgeColor: '#16a34a',
                glowClass: 'bg-card-glow-green',
              },
              {
                label: 'No Signal / Data Off',
                value: stats.noSignal,
                color: '#d97706',
                icon: 'ri-wifi-off-line',
                filter: 'no_signal',
                subLeft: 'App Stale / Offline',
                subRight: stats.noSignal > 0 ? 'Ignored by Dispatch' : '0 Disconnected',
                badgeBg: stats.noSignal > 0 ? '#FEF3C7' : '#F3F4F6',
                badgeColor: stats.noSignal > 0 ? '#D97706' : '#6B7280',
                glowClass: 'bg-card-glow-amber',
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
                label: 'Off Duty',
                value: stats.offDuty,
                color: '#6b7280',
                icon: 'ri-moon-line',
                filter: 'off_duty',
                subLeft: 'Shift Ended',
                subRight: `${stats.offDuty} Couriers`,
                glowClass: 'bg-card-glow-blue',
              },
              {
                label: 'Awaiting Verification',
                value: stats.pendingCompliance,
                color: '#ef4444',
                icon: 'ri-file-shield-line',
                filter: 'onboarding_review',
                subLeft: 'Self-Service Queue',
                subRight: stats.pendingCompliance > 0 ? 'Review Needed' : 'All Clear',
                badgeBg: stats.pendingCompliance > 0 ? '#FEE2E2' : '#DCFCE7',
                badgeColor: stats.pendingCompliance > 0 ? '#DC2626' : '#16A34A',
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

          {/* Filter + Search */}
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
                  className="btn btn-outline-success px-3 py-2 fw-semibold fs-13 d-flex align-items-center gap-1.5 rounded-2"
                  onClick={() => openModal('add')}
                  title="Direct Manual Entry for In-Office Setup"
                >
                  <i className="ri-user-add-line fs-15" />
                  <span>Manual Driver Entry (Admin Override)</span>
                </button>
              </div>
            </div>

            {/* Status tabs */}
            <div className="border-top px-3" style={{ overflowX: 'auto' }}>
              <div className="d-flex" style={{ whiteSpace: 'nowrap' }}>
                {[
                  { key: 'all', label: 'All Drivers' },
                  { key: 'onboarding_review', label: `⚠️ Review Verification (${stats.pendingCompliance})` },
                  { key: 'active', label: `🟢 Online & Ready (${stats.active})` },
                  { key: 'no_signal', label: `🟡 No Signal / Data Off (${stats.noSignal})` },
                  { key: 'on_delivery', label: `🔵 On Delivery (${stats.onDelivery})` },
                  { key: 'off_duty', label: `Off Duty (${stats.offDuty})` },
                  { key: 'suspended', label: `Suspended (${stats.suspended})` },
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
                        ONBOARDING_STATUS_CFG[driver.onboarding_status] ||
                        (driver.status === 'pending' ? ONBOARDING_STATUS_CFG.pending_verification : ONBOARDING_STATUS_CFG.approved)
                      const isPendingReview = driver.status === 'pending' || driver.onboarding_status === 'pending_verification' || driver.onboarding_status === 'documents_submitted'

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
                                  {driver.created_at || driver.joined_date ? `Registered ${String(driver.created_at || driver.joined_date).slice(0, 10)}` : 'Self-Service Applicant'}
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
                                  <i className="ri-shield-check-line me-1"></i> Review &amp; Verify Now
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

                          {/* Earnings & Settlement Bank */}
                          <td>
                            <div className="fw-bold font-monospace text-emerald fs-13">{fmt(driver.earnings || driver.total_earnings)}</div>
                            <div className="d-flex align-items-center flex-wrap gap-1 mt-0.5" style={{ fontSize: 11 }}>
                              <span className="badge bg-light text-dark border font-monospace px-1.5 py-0.5">
                                {driver.bank_name ? `${driver.bank_name} · ${driver.account_number || 'No NUBAN'}` : (driver.account_number || 'Bank Not Set')}
                              </span>
                              {Array.isArray(driver.bank_accounts) && driver.bank_accounts.length > 1 && (
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-1 py-0.5" style={{ fontSize: 10 }}>
                                  +{driver.bank_accounts.length - 1} more
                                </span>
                              )}
                              {driver.account_number && (
                                <button
                                  type="button"
                                  className="btn btn-link p-0 text-muted"
                                  title="Copy Driver Settlement NUBAN"
                                  onClick={() => {
                                    navigator.clipboard.writeText(driver.account_number)
                                    toast.success(`Copied Settlement NUBAN: ${driver.account_number}`)
                                  }}
                                >
                                  <i className="ri-file-copy-line" style={{ fontSize: 11 }} />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td>
                            <div className="d-flex flex-column align-items-start gap-1">
                              <span
                                className="badge rounded-pill px-2.5 py-1 text-xs fw-bold d-inline-flex align-items-center gap-1.5"
                                style={{ background: cfg.bg, color: cfg.color }}
                              >
                                {driver.status === 'active' && (
                                  <span className="spinner-grow spinner-grow-sm text-success" style={{ width: 7, height: 7 }} />
                                )}
                                <i className={cfg.icon} />
                                {cfg.label}
                              </span>
                              {driver.status === 'no_signal' && (
                                <span className="text-muted fs-10 fst-italic">
                                  {driver.last_telemetry_at
                                    ? `Last ping: ${new Date(driver.last_telemetry_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                    : 'No recent ping'}
                                </span>
                              )}
                              {driver.status === 'active' && (
                                <span className="text-success fs-10 fw-medium">
                                  <i className="ri-check-line me-0.5"></i>GPS Fresh (&lt;5m)
                                </span>
                              )}
                              {driver.current_order && (
                                <div className="text-primary fw-semibold fs-10 mt-0.5">Order #{driver.current_order}</div>
                              )}
                            </div>
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
                                    className="btn btn-sm btn-outline-warning"
                                    title="Suspend Driver"
                                    onClick={() => openModal('suspend', driver)}
                                  >
                                    <i className="ri-forbid-line" />
                                  </button>
                                )
                              )}

                              <button
                                className="btn btn-sm btn-outline-danger"
                                title="Delete Driver Permanently"
                                onClick={() => openModal('delete', driver)}
                              >
                                <i className="ri-delete-bin-line" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 2: DRIVER WALLETS & PAYOUT REQUESTS
      ══════════════════════════════════════════════════════════════ */}
      {tabMode === 'payouts' && (
        <>
          {/* Payouts Stat KPI Cards */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card h-100 border-0 shadow-sm rounded-4 bg-card-glow-amber" style={{ borderLeft: '4px solid #d97706' }}>
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider">Pending Payouts</span>
                    <span className="kpi-icon-pill" style={{ width: 34, height: 34, borderRadius: 10, background: '#d9770618', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ri-time-line fs-16" />
                    </span>
                  </div>
                  <div className="fs-22 fw-bolder text-dark mb-1 font-display">{fmt(payoutStats.pendingAmount)}</div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-11 mt-2 pt-2 border-top">
                    <span>{payoutStats.pendingCount} Requests Awaiting Action</span>
                    <span className="badge bg-warning-subtle text-warning px-2 py-0.5 rounded font-monospace">Needs Review</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card h-100 border-0 shadow-sm rounded-4 bg-card-glow-green" style={{ borderLeft: '4px solid #16a34a' }}>
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider">Total Disbursed</span>
                    <span className="kpi-icon-pill" style={{ width: 34, height: 34, borderRadius: 10, background: '#16a34a18', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ri-checkbox-circle-line fs-16" />
                    </span>
                  </div>
                  <div className="fs-22 fw-bolder text-dark mb-1 font-display">{fmt(payoutStats.paidAmount)}</div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-11 mt-2 pt-2 border-top">
                    <span>{payoutStats.paidCount} Completed Settlements</span>
                    <span className="badge bg-success-subtle text-success px-2 py-0.5 rounded font-monospace">Paid Out</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card h-100 border-0 shadow-sm rounded-4 bg-card-glow-blue" style={{ borderLeft: '4px solid #2563eb' }}>
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider">Fleet Accrued Earnings</span>
                    <span className="kpi-icon-pill" style={{ width: 34, height: 34, borderRadius: 10, background: '#2563eb18', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ri-money-dollar-circle-line fs-16" />
                    </span>
                  </div>
                  <div className="fs-22 fw-bolder text-dark mb-1 font-display">{fmt(stats.totalEarnings)}</div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-11 mt-2 pt-2 border-top">
                    <span>From {stats.totalDeliveries} Completed Drops</span>
                    <span className="badge bg-primary-subtle text-primary px-2 py-0.5 rounded font-monospace">Total Gross</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card h-100 border-0 shadow-sm rounded-4 bg-card-glow-teal" style={{ borderLeft: '4px solid #0d9488' }}>
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider">Withdrawal Requests</span>
                    <span className="kpi-icon-pill" style={{ width: 34, height: 34, borderRadius: 10, background: '#0d948818', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ri-file-list-3-line fs-16" />
                    </span>
                  </div>
                  <div className="fs-22 fw-bolder text-dark mb-1 font-display">{payoutStats.count} Total</div>
                  <div className="d-flex align-items-center justify-content-between text-muted fs-11 mt-2 pt-2 border-top">
                    <span>Active Bank Settlements</span>
                    <span className="text-muted">Monnify Transfer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payout Filters & Search */}
          <div className="card mb-3 border-0 shadow-sm">
            <div className="card-body d-flex flex-wrap gap-2 align-items-center p-3">
              <div className="input-group" style={{ maxWidth: 320 }}>
                <span className="input-group-text bg-light text-muted">
                  <i className="ri-search-line" />
                </span>
                <input
                  className="form-control bg-light fs-13"
                  placeholder="Search driver, phone, ref, bank..."
                  value={payoutSearch}
                  onChange={(e) => setPayoutSearch(e.target.value)}
                />
              </div>

              {payoutFilter !== 'all' && (
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setPayoutFilter('all')}>
                  <i className="ri-close-line me-1" />
                  Clear Filter
                </button>
              )}

              <div className="ms-auto d-flex gap-2 align-items-center">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 px-3"
                  onClick={loadPayouts}
                  disabled={payoutLoading}
                >
                  <i className={`ri-refresh-line ${payoutLoading ? 'ri-spin' : ''}`} />
                  <span>Refresh Requests</span>
                </button>
              </div>
            </div>

            {/* Payout status tabs */}
            <div className="border-top px-3" style={{ overflowX: 'auto' }}>
              <div className="d-flex" style={{ whiteSpace: 'nowrap' }}>
                {[
                  { key: 'all', label: 'All Payout Requests' },
                  { key: 'pending', label: `⏳ Pending Review (${payoutStats.pendingCount})` },
                  { key: 'approved', label: '🔵 Approved (Queued)' },
                  { key: 'paid', label: `✅ Disbursed / Paid (${payoutStats.paidCount})` },
                  { key: 'rejected', label: '❌ Rejected' },
                ].map((t) => (
                  <button
                    key={t.key}
                    className="btn btn-sm border-0 rounded-0 py-2.5 px-3 fs-13"
                    style={{
                      borderBottom: payoutFilter === t.key ? '3px solid #2563eb' : '3px solid transparent',
                      color: payoutFilter === t.key ? '#2563eb' : '#6b7280',
                      fontWeight: payoutFilter === t.key ? 700 : 500,
                      background: 'transparent',
                    }}
                    onClick={() => setPayoutFilter(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payouts Table */}
          <div className="card border-0 shadow-sm overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light">
                  <tr className="text-muted fs-11 text-uppercase fw-bold">
                    <th className="ps-4">Payout Ref / Date</th>
                    <th>Driver &amp; Contact</th>
                    <th>Withdrawal Amount</th>
                    <th>Destination Bank Account</th>
                    <th>Status</th>
                    <th>Processed By / Remarks</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutLoading && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-5">
                        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                        Loading driver withdrawal ledger…
                      </td>
                    </tr>
                  )}
                  {!payoutLoading && filteredPayouts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-5">
                        <div className="fs-32 mb-2">💳</div>
                        <div className="fw-bold text-dark fs-16 mb-1">No Payout Requests Pending</div>
                        <div className="text-muted small mb-3" style={{ maxWidth: 460, margin: '0 auto' }}>
                          This tab tracks driver withdrawal requests when couriers cash out their delivery earnings.
                          None have been submitted yet.
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-success fw-bold px-3.5 py-2 rounded-pill d-inline-flex align-items-center gap-2 shadow-sm"
                          onClick={() => setTabMode('fleet')}
                        >
                          <i className="ri-truck-line fs-15" />
                          <span>Switch to Fleet Directory ({drivers.length} Driver{drivers.length !== 1 ? 's' : ''})</span>
                        </button>
                      </td>
                    </tr>
                  )}
                  {!payoutLoading &&
                    filteredPayouts.map((p) => {
                      const cfg = PAYOUT_STATUS_CFG[p.status] || PAYOUT_STATUS_CFG.pending
                      const isPending = p.status === 'pending'
                      const isApproved = p.status === 'approved'

                      return (
                        <tr key={p.id}>
                          {/* Ref & Date */}
                          <td className="ps-4">
                            <div className="fw-bold text-dark font-monospace fs-13">{p.payout_ref}</div>
                            <div className="text-muted fs-11">
                              {p.requested_at ? new Date(p.requested_at).toLocaleString() : '—'}
                            </div>
                          </td>

                          {/* Driver Info */}
                          <td>
                            <div className="fw-bold text-dark fs-13">{p.driver_name}</div>
                            <div className="text-muted font-monospace fs-11">{p.driver_phone}</div>
                          </td>

                          {/* Amount */}
                          <td>
                            <div className="fw-bold text-dark fs-14 font-monospace">{fmt(p.amount)}</div>
                            <span className="badge bg-light text-muted border fs-10">Commission Payout</span>
                          </td>

                          {/* Bank Details */}
                          <td>
                            <div className="d-flex align-items-center gap-1.5">
                              <span className="fw-bold text-dark fs-13">{p.bank_name || 'Bank'}</span>
                              <button
                                type="button"
                                className="btn btn-sm btn-link p-0 text-muted"
                                title="Copy Account Number"
                                onClick={() => {
                                  navigator.clipboard.writeText(p.account_number)
                                  toast.success(`Copied: ${p.account_number}`)
                                }}
                              >
                                <i className="ri-file-copy-line" />
                              </button>
                            </div>
                            <div className="font-monospace text-primary fs-12 fw-semibold">{p.account_number}</div>
                            <div className="text-muted fs-11">{p.account_name || '—'}</div>
                          </td>

                          {/* Status */}
                          <td>
                            <span
                              className="badge rounded-pill px-2.5 py-1 text-xs fw-bold d-inline-flex align-items-center gap-1"
                              style={{ background: cfg.bg, color: cfg.color }}
                            >
                              <i className={cfg.icon} />
                              {cfg.label}
                            </span>
                          </td>

                          {/* Audit Info */}
                          <td>
                            {p.processed_at ? (
                              <div>
                                <div className="text-dark fs-12 fw-medium">
                                  {p.status === 'paid' ? 'Paid by' : p.status === 'rejected' ? 'Rejected by' : 'Updated by'}{' '}
                                  {p.processed_by_name || 'Admin'}
                                </div>
                                <div className="text-muted fs-10">{new Date(p.processed_at).toLocaleDateString()}</div>
                                {p.rejection_reason && (
                                  <div className="text-danger fs-11 mt-1">Reason: {p.rejection_reason}</div>
                                )}
                                {p.notes && <div className="text-muted fs-11 mt-1">Note: {p.notes}</div>}
                              </div>
                            ) : (
                              <span className="text-muted fs-12 italic">Awaiting Admin Review</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="text-end pe-4">
                            <div className="d-flex gap-1.5 justify-content-end">
                              {(isPending || isApproved) && (
                                <>
                                  <button
                                    className="btn btn-sm btn-success fw-bold px-2.5 py-1 text-xs d-flex align-items-center gap-1 shadow-sm"
                                    onClick={() => {
                                      setTargetPayout(p)
                                      setPayoutActionModal('approve')
                                    }}
                                  >
                                    <i className="ri-check-line" />
                                    <span>Mark Paid</span>
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger fw-semibold px-2 py-1 text-xs"
                                    onClick={() => {
                                      setTargetPayout(p)
                                      setPayoutActionModal('reject')
                                    }}
                                  >
                                    <i className="ri-close-line" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}
                              {!isPending && !isApproved && (
                                <span className="text-muted fs-12">Settled</span>
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
        </>
      )}

      {/* ════════════════════════════════════════════════
          MODALS & LIGHTBOXES
      ════════════════════════════════════════════════ */}

      {/* Payout Approve Modal */}
      {payoutActionModal === 'approve' && targetPayout && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460 }} className="shadow-2xl overflow-hidden p-4">
            <div className="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3">
              <div className="d-flex align-items-center gap-2 text-success">
                <i className="ri-money-dollar-circle-fill fs-22" />
                <h6 className="fw-bold mb-0 text-dark">Disburse / Mark Payout as Paid</h6>
              </div>
              <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={closeModal}>
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="bg-light p-3 rounded-3 mb-3 border">
              <div className="d-flex justify-content-between mb-1 small">
                <span className="text-muted">Driver Name:</span>
                <strong className="text-dark">{targetPayout.driver_name}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1 small">
                <span className="text-muted">Payout Amount:</span>
                <strong className="text-success font-monospace fs-14">{fmt(targetPayout.amount)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1 small">
                <span className="text-muted">Destination:</span>
                <span className="text-dark font-monospace">{targetPayout.bank_name} - {targetPayout.account_number}</span>
              </div>
              <div className="d-flex justify-content-between small">
                <span className="text-muted">Account Name:</span>
                <span className="text-dark">{targetPayout.account_name || '—'}</span>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold text-dark fs-12">Disbursement Reference / Note (Optional)</label>
              <input
                className="form-control fs-13"
                placeholder="e.g. Monnify Ref: MNFY-TRF-9824 / Bank Transfer Ref"
                value={payoutDisburseNote}
                onChange={(e) => setPayoutDisburseNote(e.target.value)}
              />
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-success flex-fill fw-bold text-white shadow-sm" onClick={() => handleProcessPayout('paid')} disabled={saving}>
                {saving ? 'Processing…' : 'Confirm & Mark Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout Reject Modal */}
      {payoutActionModal === 'reject' && targetPayout && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440 }} className="shadow-2xl overflow-hidden p-4">
            <div className="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3">
              <div className="d-flex align-items-center gap-2 text-danger">
                <i className="ri-close-circle-fill fs-22" />
                <h6 className="fw-bold mb-0 text-dark">Reject Payout Request</h6>
              </div>
              <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={closeModal}>
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="alert alert-warning small mb-3">
              Rejecting this payout will release the pending funds back to <strong>{targetPayout.driver_name}</strong>'s available wallet balance.
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold text-dark fs-12">Rejection Reason *</label>
              <textarea
                className="form-control fs-13"
                rows={3}
                placeholder="e.g. Incorrect bank account name, discrepancy in delivery records..."
                value={payoutRejectReason}
                onChange={(e) => setPayoutRejectReason(e.target.value)}
              />
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-danger flex-fill fw-bold text-white" onClick={() => handleProcessPayout('rejected')} disabled={saving || !payoutRejectReason.trim()}>
                {saving ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Other Modals (Compliance, Profile, Onboarding, Suspend) */}
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
                    <div className="col-12">
                      <span className="text-muted d-block fs-11 text-uppercase fw-bold mb-1">
                        Commission Payout &amp; Withdrawal Accounts ({Array.isArray(selected.bank_accounts) && selected.bank_accounts.length > 0 ? selected.bank_accounts.length : (selected.account_number ? 1 : 0)})
                      </span>
                      {(() => {
                        const accs = (Array.isArray(selected.bank_accounts) && selected.bank_accounts.length > 0)
                          ? selected.bank_accounts
                          : (selected.account_number ? [{
                              bank_name: selected.bank_name || 'Bank',
                              account_number: selected.account_number,
                              account_name: selected.account_name || selected.name,
                              is_default: true,
                            }] : []);

                        if (accs.length === 0) {
                          return <span className="text-muted fs-12">No payout account configured</span>
                        }

                        return (
                          <div className="d-flex flex-wrap gap-2">
                            {accs.map((a, i) => (
                              <div key={a.id || i} className="p-2 border rounded bg-light-subtle d-flex align-items-center gap-2 fs-12">
                                <i className="ri-bank-line text-primary" />
                                <div>
                                  <div className="fw-semibold text-dark">
                                    {a.bank_name}{' '}
                                    {a.is_default && <span className="badge bg-success-subtle text-success fs-10 px-1 py-0 border">Default</span>}
                                  </div>
                                  <div className="text-muted font-monospace fs-11">{a.account_number} · {a.account_name}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
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
                  maxWidth: 640,
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
                      {selected.status === 'no_signal' && (
                        <div className="mt-1 text-warning font-monospace" style={{ fontSize: 9 }}>
                          No ping &gt;5m (Data/GPS Off)
                        </div>
                      )}
                      {selected.status === 'active' && (
                        <div className="mt-1 text-emerald font-monospace" style={{ fontSize: 9 }}>
                          Signal live &amp; fresh
                        </div>
                      )}
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
                      { label: 'Accrued Earnings', value: fmt(selected.earnings || selected.total_earnings), color: '#10b981' },
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

                  {/* Driver Wallet & Payout Account Summary */}
                  <div className="border rounded-3 p-3.5 mb-4 bg-light-subtle">
                    <div className="d-flex align-items-center justify-content-between mb-2.5 pb-2 border-bottom">
                      <span className="fw-bold fs-13 text-dark d-flex align-items-center gap-1.5">
                        <i className="ri-wallet-3-line text-emerald fs-16" />
                        Dedicated Driver Inflow Account &amp; Settlement Wallet
                      </span>
                      <span className="badge bg-emerald-subtle text-emerald fs-11">Virtual Account Active</span>
                    </div>
                    
                    {/* Inflow Virtual Account */}
                    <div className="bg-white p-2.5 rounded-2 border mb-2.5">
                      <div className="text-muted fs-11 text-uppercase fw-bold mb-1">
                        📥 Dedicated Virtual Account (Inflow / Direct Credit)
                      </div>
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <div className="fw-bold text-dark fs-14 font-monospace">
                            {selected.wallet_account_number || ('855' + String(selected.id).padStart(7, '0'))}
                          </div>
                          <div className="text-muted fs-11">
                            {selected.wallet_bank_name || 'Monnify / Wema Bank'} · {selected.wallet_account_name || (`BEMS - ${selected.name?.toUpperCase()}`)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 px-2.5 py-1 fs-11"
                          onClick={() => {
                            const num = selected.wallet_account_number || ('855' + String(selected.id).padStart(7, '0'))
                            navigator.clipboard.writeText(num)
                            toast.success(`Copied Dedicated Account: ${num}`)
                          }}
                        >
                          <i className="ri-file-copy-line" />
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>

                    {/* Commission Rate */}
                    <div className="mb-2.5 pb-2 border-bottom d-flex align-items-center justify-content-between">
                      <span className="text-muted fs-12">Driver Commission Rate</span>
                      <strong className="text-dark font-monospace fs-13">{fmt(selected.commission_per_delivery || 500)} / drop</strong>
                    </div>

                    {/* Withdrawal Outflow Bank Accounts */}
                    <div className="mb-1">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="text-muted fs-11 text-uppercase fw-bold d-flex align-items-center gap-1">
                          <i className="ri-bank-line text-primary" />
                          Registered Withdrawal &amp; Payout Accounts
                        </span>
                        <span className="badge bg-light text-muted border fs-10">
                          {((Array.isArray(selected.bank_accounts) && selected.bank_accounts.length > 0) ? selected.bank_accounts.length : (selected.account_number ? 1 : 0))} account{((Array.isArray(selected.bank_accounts) && selected.bank_accounts.length > 0) ? selected.bank_accounts.length : (selected.account_number ? 1 : 0)) === 1 ? '' : 's'}
                        </span>
                      </div>

                      {(() => {
                        const accounts = (Array.isArray(selected.bank_accounts) && selected.bank_accounts.length > 0)
                          ? selected.bank_accounts
                          : (selected.account_number ? [{
                              id: 'legacy',
                              bank_name: selected.bank_name || 'Personal Bank',
                              account_number: selected.account_number,
                              account_name: selected.account_name || selected.name,
                              is_default: true,
                              is_verified: true,
                            }] : [])

                        if (accounts.length === 0) {
                          return (
                            <div className="p-2.5 bg-light rounded text-muted fs-12 text-center">
                              No withdrawal bank accounts configured yet.
                            </div>
                          )
                        }

                        return (
                          <div className="d-flex flex-column gap-2">
                            {accounts.map((acc, idx) => (
                              <div
                                key={acc.id || idx}
                                className="bg-white p-2.5 rounded-2 border d-flex align-items-center justify-content-between shadow-xs"
                                style={{
                                  borderLeft: acc.is_default ? '3px solid #16a34a' : '1px solid #e5e7eb',
                                }}
                              >
                                <div className="d-flex align-items-center gap-2.5">
                                  <div
                                    className="d-flex align-items-center justify-content-center rounded-circle text-primary bg-primary-subtle"
                                    style={{ width: 32, height: 32, flexShrink: 0 }}
                                  >
                                    <i className="ri-bank-line fs-14" />
                                  </div>
                                  <div>
                                    <div className="d-flex align-items-center gap-1.5">
                                      <span className="fw-bold text-dark fs-12">{acc.bank_name || 'Bank'}</span>
                                      {acc.is_default && (
                                        <span className="badge bg-success-subtle text-success fs-10 px-1.5 py-0.5 border border-success-subtle">
                                          Default
                                        </span>
                                      )}
                                      {acc.is_verified && (
                                        <span className="badge bg-primary-subtle text-primary fs-10 px-1.5 py-0.5 border border-primary-subtle">
                                          Verified
                                        </span>
                                      )}
                                    </div>
                                    <div className="d-flex align-items-center gap-2 text-muted fs-11 mt-0.5">
                                      <span className="font-monospace text-dark fw-semibold">{acc.account_number}</span>
                                      <span>•</span>
                                      <span>{acc.account_name || selected.name}</span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-light text-muted border d-flex align-items-center gap-1 px-2 py-1 fs-11"
                                  title="Copy NUBAN"
                                  onClick={() => {
                                    navigator.clipboard.writeText(acc.account_number)
                                    toast.success(`Copied NUBAN: ${acc.account_number}`)
                                  }}
                                >
                                  <i className="ri-file-copy-line" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
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

          {/* ── 3. MANUAL DRIVER ENTRY / EDIT MODAL ─── */}
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
                    {isEditing ? 'Edit Dispatch Driver Profile' : '🛵 Manual Driver Entry (Admin Override)'}
                  </h5>
                  <p className="text-muted small mb-0">
                    {isEditing
                      ? 'Update fleet vehicle, remuneration, and contact details.'
                      : 'Direct manual registration for physical/in-office driver setup.'}
                  </p>
                </div>
                <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={closeModal}>
                  <i className="ri-close-line" />
                </button>
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
                      Email Address (Optional)
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

                  {!isEditing && (
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
                    disabled={!form.name || !form.phone || saving}
                  >
                    <i className={`${isEditing ? 'ri-save-line' : 'ri-user-add-line'} me-1.5`} />
                    {saving
                      ? 'Processing…'
                      : isEditing
                      ? 'Save Changes'
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

          {/* ── 6. DELETE DRIVER MODAL ────────────────────────── */}
          {activeModal === 'delete' && selected && (
            <div
              style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440 }}
              className="shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom bg-danger bg-opacity-10">
                <h5 className="mb-0 text-danger fw-bold font-display d-flex align-items-center gap-2">
                  <i className="ri-delete-bin-line fs-5" />
                  Delete Driver Permanently
                </h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}>
                  <i className="ri-close-line" />
                </button>
              </div>
              <div className="p-4">
                <div className="alert alert-danger mb-3 small">
                  <i className="ri-error-warning-line me-1 fw-bold"></i>
                  Are you sure you want to permanently delete <strong>{selected.name}</strong> ({selected.phone || selected.email})?
                  <div className="mt-1 text-muted">
                    This will permanently remove the driver profile, their Dedicated Virtual Account record, commission records, and GPS tracking data.
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal} disabled={deleting}>
                    Cancel
                  </button>
                  <button className="btn btn-danger flex-fill fw-bold d-flex align-items-center justify-content-center gap-1" onClick={deleteDriver} disabled={deleting}>
                    <i className={deleting ? 'ri-loader-4-line ri-spin' : 'ri-delete-bin-line'} />
                    {deleting ? 'Deleting...' : 'Yes, Delete Driver'}
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
