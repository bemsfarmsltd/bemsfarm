import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../lib/api'
import { useRealtimeEvent } from '../../context/RealtimeContext'
import BemsDriverStatementDocument, { printOfficialDocument } from '../../components/documents/BemsDriverStatementDocument'
import DriverDispatchConsole from './DriverDispatchConsole'

// ─── Fix Leaflet default marker icons in Vite ─────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Leaflet Map Invalidation & Dynamic Re-centering Controller
function MapCenterController({ center, zoom = 15 }) {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 200)
    return () => clearTimeout(timer)
  }, [map])

  useEffect(() => {
    if (center && Array.isArray(center) && center[0] != null && center[1] != null && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom, { animate: true })
    }
  }, [center, zoom, map])
  return null
}

function createCourierPinIcon(driverName, vehicleType = 'motorcycle', isLive = true, heading = 0) {
  const iconClass =
    vehicleType === 'car' ? 'ri-car-fill' :
    vehicleType === 'van' ? 'ri-truck-fill' :
    vehicleType === 'tricycle' ? 'ri-e-bike-2-fill' :
    'ri-riding-line'

  const pulseRing = isLive
    ? `<span style="position:absolute;inset:-6px;border-radius:50%;background:rgba(22,163,74,0.35);animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>`
    : ''

  const rotation = (heading != null && heading !== 0) ? `transform: rotate(${heading}deg);` : ''

  return L.divIcon({
    className: 'custom-live-driver-pin',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
    html: `
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
        ${pulseRing}
        <div style="width:38px;height:38px;border-radius:50%;background:${isLive ? '#16a34a' : '#475569'};display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,0.3);border:2.5px solid #ffffff;z-index:2;${rotation}">
          <i class="${iconClass}" style="font-size:18px;"></i>
        </div>
      </div>
    `,
  })
}

function createCustomerPinIcon(customerName = 'Customer') {
  return L.divIcon({
    className: 'custom-customer-dest-pin',
    iconSize: [36, 46],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="width:36px;height:36px;border-radius:50%;background:#ef4444;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 12px rgba(239,68,68,0.4);border:2px solid #fff;">
          <i class="ri-home-4-fill" style="font-size:16px;"></i>
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #ef4444;margin-top:-2px;"></div>
      </div>
    `,
  })
}

function createHubPinIcon() {
  return L.divIcon({
    className: 'custom-hub-pin',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
    html: `
      <div style="width:36px;height:36px;border-radius:10px;background:#166534;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 10px rgba(22,101,52,0.4);border:2px solid #fff;">
        <i class="ri-plant-fill" style="font-size:18px;"></i>
      </div>
    `,
  })
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'Unknown'
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diffSec < 45) return 'Just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

const STATUS_CFG = {
  active:        { label: 'Online & Ready', color: '#16a34a', bg: '#dcfce7', icon: 'ri-signal-tower-fill' },
  acquiring_gps: { label: 'Online (Acquiring GPS)', color: '#0284c7', bg: '#e0f2fe', icon: 'ri-radar-line' },
  no_signal:     { label: 'No Signal / Offline', color: '#d97706', bg: '#fef3c7', icon: 'ri-wifi-off-line' },
  on_delivery:   { label: 'On Delivery', color: '#3b82f6', bg: '#dbeafe', icon: 'ri-truck-line'         },
  off_duty:      { label: 'Off Duty',    color: '#6b7280', bg: '#f3f4f6', icon: 'ri-moon-line'             },
  pending:       { label: 'Pending Review', color: '#d97706', bg: '#fef3c7', icon: 'ri-time-line'          },
  suspended:     { label: 'Suspended',   color: '#ef4444', bg: '#fee2e2', icon: 'ri-forbid-line'           },
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
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const driverIdFromUrl = searchParams.get('driverId')

  const [tabMode, setTabMode] = useState(
    tabFromUrl === 'chat' ? 'chat' : (tabFromUrl === 'payouts' ? 'payouts' : 'fleet')
  ) // 'fleet' | 'payouts' | 'chat'
  const [selectedChatDriverId, setSelectedChatDriverId] = useState(driverIdFromUrl || null)
  const [chatUnreadCount, setChatUnreadCount] = useState(0)

  useEffect(() => {
    if (tabFromUrl && ['fleet', 'payouts', 'chat'].includes(tabFromUrl)) {
      setTabMode(tabFromUrl)
    }
    if (driverIdFromUrl) {
      setSelectedChatDriverId(driverIdFromUrl)
    }
  }, [tabFromUrl, driverIdFromUrl])

  const loadChatUnread = useCallback(async () => {
    try {
      const res = await api.get('/admin/customers/conversations/driver-inbox')
      const convs = res.data?.conversations || []
      const total = convs.reduce((acc, c) => acc + Number(c.unread_count || 0), 0)
      setChatUnreadCount(total)
    } catch {}
  }, [])

  useEffect(() => {
    loadChatUnread()
    const t = setInterval(loadChatUnread, 8000)
    return () => clearInterval(t)
  }, [loadChatUnread])

  useRealtimeEvent('support:driver_message', loadChatUnread)

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
  const [resendingLoginEmail, setResendingLoginEmail] = useState(false)

  const [deleting, setDeleting] = useState(false)
  const [unlockingPayout, setUnlockingPayout] = useState(false)
  const [statementData, setStatementData] = useState(null)
  const [loadingStatement, setLoadingStatement] = useState(false)

  // Driver Live GPS Tracking State
  const [locationData, setLocationData] = useState(null)
  const [loadingLocation, setLoadingLocation] = useState(false)

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
  useRealtimeEvent('driver:location', (evt) => {
    load(true)
    if (activeModal === 'location' && selected && (!evt?.driver_id || Number(evt.driver_id) === Number(selected.id))) {
      api.get(`/admin/deliveries/drivers/${selected.id}/location`)
        .then((res) => setLocationData(res.data))
        .catch(() => {})
    }
  })
  useRealtimeEvent('delivery:updated', () => load(true))
  useRealtimeEvent('emergency:sos', () => load(true))
  useRealtimeEvent('window:focused', () => load(true))

  const refreshDriverLocation = useCallback((driverId) => {
    if (!driverId) return
    setLoadingLocation(true)
    api.get(`/admin/deliveries/drivers/${driverId}/location`)
      .then((res) => {
        setLocationData(res.data)
        toast.success('Live GPS coordinates updated')
      })
      .catch((err) => {
        console.error('Failed to refresh driver location:', err)
        toast.error('Failed to refresh GPS telemetry')
      })
      .finally(() => setLoadingLocation(false))
  }, [])

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
    const pollTimer = setInterval(() => {
      load(true)
    }, 8000)
    return () => {
      clearTimeout(t)
      clearInterval(pollTimer)
    }
  }, [load])

  useEffect(() => {
    if (tabMode === 'payouts') {
      loadPayouts()
    }
  }, [tabMode, loadPayouts])

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('action') === 'new') {
      openModal('add')
    }
  }, [])

  const openModal = (type, driver = null) => {
    setSelected(driver)
    setActiveModal(type)
    setSuspendNote('')
    setComplianceRejectNotes('')
    setViewingDocument(null)

    if (type === 'location' && driver) {
      setLoadingLocation(true)
      setLocationData(null)
      api.get(`/admin/deliveries/drivers/${driver.id}/location`)
        .then((res) => setLocationData(res.data))
        .catch((err) => {
          console.error('Failed to load driver live location:', err)
          toast.error('Failed to load driver GPS coordinates')
        })
        .finally(() => setLoadingLocation(false))
    }

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

    if (type === 'statement' && driver) {
      setLoadingStatement(true)
      api.get(`/admin/wallets/drivers/${driver.id}/statement`)
        .then((res) => setStatementData(res.data || null))
        .catch(() => toast.error('Failed to load driver statement of account'))
        .finally(() => setLoadingStatement(false))
    }
  }

  const closeModal = () => {
    setActiveModal(null)
    setSelected(null)
    setLocationData(null)
    setViewingDocument(null)
    setPayoutActionModal(null)
    setTargetPayout(null)
    setPayoutDisburseNote('')
    setPayoutRejectReason('')
    setStatementData(null)
    setLoadingStatement(false)
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

  async function handleResendLoginEmail() {
    if (!selected) return
    setResendingLoginEmail(true)
    try {
      const res = await api.post(`/admin/deliveries/drivers/${selected.id}/resend-login-email`)
      toast.success(res.data?.message || `Sign-in credentials email sent to ${selected.email || selected.name}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend login email')
    } finally {
      setResendingLoginEmail(false)
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

  async function handleUnlockPayout(driver) {
    if (!driver) return
    const confirmMsg = `Unlock payouts and unfreeze wallet for ${driver.name}? This will clear failed PIN attempts and restore withdrawal privileges.`
    if (!window.confirm(confirmMsg)) return

    setUnlockingPayout(true)
    try {
      const res = await api.patch(`/admin/deliveries/drivers/${driver.id}/unlock-payout`, {
        notes: 'Manually unlocked via Dispatch Admin Dashboard',
      })
      toast.success(res.data?.message || `Payout access restored for ${driver.name}`)
      await load()
      setSelected((prev) => (prev && prev.id === driver.id ? {
        ...prev,
        payout_locked: false,
        payout_locked_reason: null,
        payout_locked_at: null,
        wallet_is_frozen: false,
        wallet_frozen_reason: null,
        pin_failed_attempts: 0,
        pin_locked_until: null,
      } : prev))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlock driver payout')
    } finally {
      setUnlockingPayout(false)
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
              {tabMode === 'fleet' ? 'Drivers & Verification' : tabMode === 'chat' ? 'Courier Dispatch Chat' : 'Wallets & Payouts'}
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

      {/* Primary Mode Tabs (Fleet vs Payouts) & Direct COD Shortcut */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <div className="d-flex align-items-center gap-2 bg-light p-1.5 rounded-3 border" style={{ maxWidth: 760, width: '100%' }}>
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
            onClick={() => {
              setTabMode('fleet')
              setSearchParams({ tab: 'fleet' }, { replace: true })
            }}
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
            onClick={() => {
              setTabMode('payouts')
              setSearchParams({ tab: 'payouts' }, { replace: true })
            }}
          >
            <i className="ri-wallet-3-line fs-16" />
            <span>💳 Driver Wallets &amp; Payouts</span>
            {payoutStats.pendingCount > 0 && (
              <span className="badge bg-danger rounded-pill px-2 py-0.5 fs-10">{payoutStats.pendingCount}</span>
            )}
          </button>
          <button
            type="button"
            className={`btn btn-sm flex-fill py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-2 transition-all ${
              tabMode === 'chat' ? 'btn-dark text-white shadow-sm' : 'btn-light text-dark'
            }`}
            style={{
              backgroundColor: tabMode === 'chat' ? '#0f172a' : '#f8fafc',
              color: tabMode === 'chat' ? '#ffffff' : '#334155',
              border: tabMode === 'chat' ? '1px solid #0f172a' : '1px solid #e2e8f0',
            }}
            onClick={() => {
              setTabMode('chat')
              setSearchParams({ tab: 'chat' }, { replace: true })
            }}
          >
            <i className="ri-chat-3-line fs-16" />
            <span>💬 Courier Dispatch Chat</span>
            {chatUnreadCount > 0 && (
              <span className="badge rounded-pill px-2 py-0.5 fs-10" style={{ background: '#059669', color: '#ffffff' }}>
                {chatUnreadCount} new
              </span>
            )}
          </button>
        </div>

        <Link
          to="/settings/payment"
          className="btn btn-outline-success d-flex align-items-center gap-2 px-3 py-2 fw-semibold shadow-sm bg-white"
          title="Open Payment & Cash on Delivery Settings"
        >
          <i className="ri-hand-coin-line fs-18 text-success" />
          <span>Cash on Delivery (COD) Settings →</span>
        </Link>
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

                              {Boolean(driver.payout_locked || driver.wallet_is_frozen || (driver.pin_failed_attempts >= 5)) && (
                                <span
                                  className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2 py-0.5 text-xs fw-bold d-inline-flex align-items-center gap-1 mt-0.5"
                                  title={driver.payout_locked_reason || driver.wallet_frozen_reason || 'Payouts locked due to failed PIN attempts'}
                                >
                                  <i className="ri-lock-2-line" /> Payout Locked
                                </span>
                              )}

                              {/* Live GPS coordinates & telemetry indicator */}
                              {driver.status === 'off_duty' ? (
                                <span className="text-muted fs-10 fst-italic d-inline-flex align-items-center gap-1 mt-0.5">
                                  <i className="ri-moon-line fs-11 text-muted" /> Location Inactive (Shift Ended)
                                </span>
                              ) : driver.status === 'suspended' ? (
                                <span className="text-muted fs-10 fst-italic d-inline-flex align-items-center gap-1 mt-0.5">
                                  <i className="ri-forbid-line fs-11 text-danger" /> Tracking Suspended
                                </span>
                              ) : driver.current_lat != null && driver.current_lng != null ? (
                                <button
                                  type="button"
                                  className="btn btn-xs p-0 border-0 bg-transparent text-start d-inline-flex align-items-center gap-1 mt-0.5"
                                  onClick={() => openModal('location', driver)}
                                  title="Click to view exact present GPS location on interactive map"
                                  style={{ cursor: 'pointer' }}
                                >
                                  <i className={`ri-map-pin-${driver.is_gps_live ? '2-fill text-success' : 'line text-primary'} fs-12`} />
                                  <span className="font-monospace fw-bold text-dark fs-10">
                                    {Number(driver.current_lat).toFixed(4)}°, {Number(driver.current_lng).toFixed(4)}°
                                  </span>
                                  {driver.is_gps_live ? (
                                    <span className="badge bg-success-subtle text-success py-0 px-1 fs-9 fw-bold border border-success-subtle">
                                      LIVE
                                    </span>
                                  ) : (
                                    <span className="badge bg-info-subtle text-info-emphasis py-0 px-1 fs-9 border border-info-subtle">
                                      {formatRelativeTime(driver.last_gps_at || driver.last_telemetry_at)}
                                    </span>
                                  )}
                                </button>
                              ) : driver.status === 'acquiring_gps' ? (
                                <span className="text-info fs-10 fst-italic d-inline-flex align-items-center gap-1 mt-0.5">
                                  <i className="ri-radar-line text-info fs-11" /> Signal Connected · Acquiring GPS fix...
                                </span>
                              ) : (
                                <span className="text-muted fs-10 fst-italic d-inline-flex align-items-center gap-1 mt-0.5">
                                  <i className="ri-map-pin-line text-muted fs-11" /> No GPS fix yet
                                </span>
                              )}

                              {driver.status === 'no_signal' && (
                                <span className="text-muted fs-10 fst-italic">
                                  {driver.last_telemetry_at
                                    ? `Last ping: ${new Date(driver.last_telemetry_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                    : 'No recent ping'}
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
                                className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1"
                                title="View Driver Exact Present Location & Live GPS Map"
                                onClick={() => openModal('location', driver)}
                                style={{ borderColor: '#86efac', color: '#16a34a' }}
                              >
                                <i className="ri-map-pin-user-line" />
                              </button>

                              <button
                                className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1"
                                title="Open Live Dispatch Chat with Courier"
                                style={{ borderColor: '#86efac', color: '#059669', background: '#ecfdf5' }}
                                onClick={() => {
                                  setSelectedChatDriverId(driver.id)
                                  setTabMode('chat')
                                  setSearchParams({ tab: 'chat', driverId: driver.id }, { replace: true })
                                }}
                              >
                                <i className="ri-chat-3-line" />
                              </button>

                              <button
                                className="btn btn-sm btn-outline-secondary"
                                title="View Full Profile & Compliance"
                                onClick={() => openModal('profile', driver)}
                              >
                                <i className="ri-eye-line" />
                              </button>

                              {Boolean(driver.payout_locked || driver.wallet_is_frozen || (driver.pin_failed_attempts >= 5)) && (
                                <button
                                  className="btn btn-sm btn-warning text-dark fw-bold d-inline-flex align-items-center gap-1 shadow-sm px-2.5"
                                  title="Unlock Payout & Reset PIN Lock"
                                  disabled={unlockingPayout}
                                  onClick={() => handleUnlockPayout(driver)}
                                >
                                  <i className="ri-lock-unlock-line" />
                                  <span>Unlock</span>
                                </button>
                              )}

                              {isPendingReview && (
                                <button
                                  className="btn btn-sm btn-success text-white fw-bold d-inline-flex align-items-center gap-1 shadow-sm px-2.5"
                                  title="Approve Compliance & Activate Driver"
                                  style={{ background: '#059669', borderColor: '#059669' }}
                                  onClick={() => {
                                    setSelected(driver)
                                    handleComplianceDecision('approve')
                                  }}
                                >
                                  <i className="ri-checkbox-circle-line" />
                                  <span>Approve</span>
                                </button>
                              )}

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

      {/* ══════════════════════════════════════════════════════════════
          VIEW 3: CENTRAL DRIVER DISPATCH & ALL-COURIER CHAT
      ══════════════════════════════════════════════════════════════ */}
      {tabMode === 'chat' && (
        <div style={{ height: 'calc(100vh - 210px)', minHeight: 580, maxHeight: 850, width: '100%', maxWidth: '100%', boxSizing: 'border-box', marginBottom: 24 }}>
          <DriverDispatchConsole
            initialDriverId={selectedChatDriverId}
          />
        </div>
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
                maxWidth: 840,
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3.5 px-4 border-bottom bg-light-subtle d-flex justify-content-between align-items-center flex-shrink-0">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold fs-18"
                    style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}
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
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm text-white fw-bold d-flex align-items-center gap-1.5 shadow-sm px-3 py-1.5"
                    style={{ background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: 8, border: 'none' }}
                    disabled={saving}
                    onClick={() => handleComplianceDecision('approve')}
                  >
                    <i className="ri-checkbox-circle-line fs-14"></i>
                    <span>Approve Driver</span>
                  </button>
                  <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={closeModal}>
                    <i className="ri-close-line" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-grow-1" style={{ overflowY: 'auto' }}>
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
                  {(() => {
                    const resolveDocUrl = (driver, key) => {
                      if (!driver) return null;
                      const docs = (typeof driver.documents === 'object' && driver.documents !== null)
                        ? driver.documents
                        : (typeof driver.documents === 'string' ? (() => { try { return JSON.parse(driver.documents); } catch(e) { return {}; } })() : {});
                      
                      let rawUrl = null;
                      if (key === 'drivers_license' || key === 'driver_license') {
                        rawUrl = docs.driver_license_front || docs.driver_license || docs.drivers_license || docs.license || null;
                      } else if (key === 'driver_license_back') {
                        rawUrl = docs.driver_license_back || docs.license_back || null;
                      } else if (key === 'passport_photo') {
                        rawUrl = docs.passport_photo || docs.photo || docs.avatar || docs.avatar_url || driver.avatar_url || null;
                      } else if (key === 'vehicle_registration') {
                        rawUrl = docs.vehicle_registration || docs.vehicle_reg || docs.vehicle || docs.vehicle_photo || docs.logbook || null;
                      } else if (key === 'nin_slip') {
                        rawUrl = docs.nin_slip || docs.nin || docs.nin_document || null;
                      } else if (key === 'guarantor_form') {
                        rawUrl = docs.guarantor_form || docs.guarantor || docs.guarantor_document || null;
                      } else {
                        rawUrl = docs[key] || null;
                      }

                      if (!rawUrl || typeof rawUrl !== 'string') return null;

                      // Automatically normalize production URLs so LiteSpeed reverse proxy routes to Node.js
                      if (rawUrl.includes('/uploads/documents/') || (rawUrl.includes('api.bemsfarms.com') && rawUrl.includes('/uploads/'))) {
                        const filename = rawUrl.split('/').pop().split('?')[0];
                        if (filename) {
                          return `https://api.bemsfarms.com/api/driver/documents/file/${filename}`;
                        }
                      }
                      return rawUrl;
                    };

                    const docItems = [
                      { key: 'drivers_license', title: "Driver's License (Front)", icon: '🪪' },
                      ...(resolveDocUrl(selected, 'driver_license_back') ? [{ key: 'driver_license_back', title: "Driver's License (Back)", icon: '🪪' }] : []),
                      { key: 'nin_slip', title: 'National ID / NIN Slip', icon: '📜' },
                      { key: 'vehicle_registration', title: 'Vehicle Registration', icon: '🛵' },
                      { key: 'passport_photo', title: 'Passport Photo', icon: '📸' },
                      { key: 'guarantor_form', title: 'Guarantor Form / Letter', icon: '📝' },
                    ];

                    return docItems.map((doc) => {
                      const docUrl = resolveDocUrl(selected, doc.key);
                      const isPdf = typeof docUrl === 'string' && docUrl.toLowerCase().includes('.pdf');
                      return (
                        <div key={doc.key} className="col-sm-6 col-md-4">
                          <div className="border rounded-3 p-3 text-center h-100 bg-light d-flex flex-column justify-content-between shadow-xs">
                            <div>
                              <div className="fs-24 mb-1">{doc.icon}</div>
                              <div className="fw-bold fs-12 text-dark mb-2">{doc.title}</div>
                            </div>
                            {docUrl ? (
                              <div>
                                <div
                                  className="rounded overflow-hidden mb-2 border bg-white position-relative d-flex align-items-center justify-content-center"
                                  style={{ height: 100, cursor: 'pointer' }}
                                  onClick={() => setViewingDocument({ title: doc.title, url: docUrl, isPdf })}
                                  title="Click to view full document"
                                >
                                  {isPdf ? (
                                    <div className="text-center p-2 text-danger">
                                      <i className="ri-file-pdf-2-line fs-32 d-block mb-1"></i>
                                      <span className="badge bg-danger-subtle text-danger fs-10 px-2 py-1 border border-danger-subtle">PDF Document</span>
                                    </div>
                                  ) : (
                                    <img
                                      src={docUrl}
                                      alt={doc.title}
                                      className="w-100 h-100 object-fit-contain"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        if (e.target.parentElement) {
                                          e.target.parentElement.innerHTML = `
                                            <div class="text-center p-2 text-muted">
                                              <i class="ri-file-shield-line fs-28 d-block mb-1 text-primary"></i>
                                              <span class="fs-11 fw-semibold text-dark d-block">Document Attached</span>
                                              <span class="fs-10 text-muted d-block text-truncate px-1" style="max-width: 130px;">${docUrl.split('/').pop()}</span>
                                            </div>
                                          `;
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                                <div className="d-flex gap-1">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary flex-fill fs-11 fw-semibold py-1"
                                    onClick={() => setViewingDocument({ title: doc.title, url: docUrl, isPdf })}
                                  >
                                    <i className="ri-zoom-in-line me-1"></i> View Scan
                                  </button>
                                  <a
                                    href={docUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-sm btn-light border fs-11 py-1 px-2 text-dark"
                                    title="Open file in new tab"
                                  >
                                    <i className="ri-external-link-line"></i>
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <span className="badge bg-secondary-subtle text-secondary py-2 fs-11">
                                Not Provided
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
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
              </div>

              {/* Sticky Action Footer */}
              <div
                className="p-3.5 px-4 border-top bg-white d-flex gap-3 align-items-center flex-shrink-0"
                style={{
                  boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.06)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline-danger py-2.5 px-3 fw-bold fs-13"
                  style={{ minWidth: 200, borderRadius: 10 }}
                  disabled={saving}
                  onClick={() => handleComplianceDecision('reject')}
                >
                  <i className="ri-close-circle-line me-1"></i> Request Document Re-upload
                </button>

                <button
                  type="button"
                  className="btn flex-fill py-2.5 px-4 fw-bold fs-14 text-white shadow-sm d-flex align-items-center justify-content-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    border: 'none',
                    borderRadius: 10,
                    minHeight: 46,
                  }}
                  disabled={saving}
                  onClick={() => handleComplianceDecision('approve')}
                >
                  <i className="ri-checkbox-circle-line fs-18"></i>
                  <span>Approve Compliance &amp; Activate Driver</span>
                </button>
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
                style={{ background: '#fff', borderRadius: 16, maxWidth: 900, width: '100%', maxHeight: '92vh' }}
                className="overflow-hidden p-3 d-flex flex-column shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="d-flex justify-content-between align-items-center mb-2 px-2 pb-2 border-bottom">
                  <div>
                    <strong className="text-dark fs-15 me-2">{viewingDocument.title}</strong>
                    <span className="fs-11 text-muted font-monospace">
                      {viewingDocument.url?.startsWith('data:') ? 'High-Res Audit Scan' : viewingDocument.url?.split('/').pop()}
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <a
                      href={viewingDocument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-primary fs-12 fw-semibold px-2 py-1"
                    >
                      <i className="ri-external-link-line me-1"></i> Open in New Tab
                    </a>
                    <button className="btn btn-sm btn-outline-secondary fs-12 py-1" onClick={() => setViewingDocument(null)}>
                      ✕ Close
                    </button>
                  </div>
                </div>

                <div
                  className="text-center bg-dark rounded p-2 flex-grow-1 d-flex align-items-center justify-content-center position-relative"
                  style={{ minHeight: 400, maxHeight: '76vh', overflow: 'auto' }}
                >
                  {viewingDocument.isPdf || viewingDocument.url?.toLowerCase().includes('.pdf') ? (
                    <iframe
                      src={viewingDocument.url}
                      title={viewingDocument.title}
                      style={{ width: '100%', height: '72vh', border: 'none', borderRadius: 8, background: '#fff' }}
                    />
                  ) : (
                    <img
                      src={viewingDocument.url}
                      alt={viewingDocument.title}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '74vh',
                        objectFit: 'contain',
                        borderRadius: 8,
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                        background: '#fff',
                        display: 'block',
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.parentElement) {
                          e.target.parentElement.innerHTML = `
                            <div class="p-5 text-center text-white">
                              <i class="ri-file-search-line fs-48 text-warning d-block mb-3"></i>
                              <h6 class="fw-bold text-white mb-2">Unable to render direct image preview</h6>
                              <p class="text-white-50 fs-12 mb-3" style="max-width: 440px; margin: 0 auto;">
                                The file may be in an external or secured format. You can open and inspect it directly in a dedicated tab.
                              </p>
                              <a href="${viewingDocument.url}" target="_blank" rel="noopener noreferrer" class="btn btn-light btn-sm fw-bold px-3 py-2">
                                <i class="ri-external-link-line me-1"></i> Open Document in New Tab
                              </a>
                            </div>
                          `;
                        }
                      }}
                    />
                  )}
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

                  {/* Present GPS Telemetry & Live Location Card */}
                  <div className="border rounded-3 p-3 mb-4 bg-light-subtle shadow-xs">
                    <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                      <span className="fw-bold fs-13 text-dark d-flex align-items-center gap-1.5">
                        <i className="ri-map-pin-user-line text-success fs-16" />
                        Driver Exact Present Location &amp; Telemetry
                      </span>
                      {selected.current_lat != null && selected.current_lng != null ? (
                        <span className={`badge ${selected.is_gps_live ? 'bg-success text-white' : 'bg-secondary-subtle text-secondary border'} fs-11`}>
                          {selected.is_gps_live ? '● Live GPS Streaming' : 'Saved Telemetry Fix'}
                        </span>
                      ) : (
                        <span className="badge bg-warning-subtle text-warning-emphasis fs-11">No GPS Fix</span>
                      )}
                    </div>

                    {selected.current_lat != null && selected.current_lng != null ? (
                      <div>
                        <div className="row g-2 mb-2.5">
                          <div className="col-7">
                            <div className="text-muted fs-11 text-uppercase fw-semibold">Exact GPS Coordinates</div>
                            <div className="fw-bold font-monospace text-dark fs-13 mt-0.5">
                              {Number(selected.current_lat).toFixed(5)}°, {Number(selected.current_lng).toFixed(5)}°
                            </div>
                            <div className="text-muted fs-11 mt-0.5">
                              {selected.zone ? `Zone: ${selected.zone}` : 'Assigned Territory'}
                            </div>
                          </div>
                          <div className="col-5 text-end">
                            <div className="text-muted fs-11 text-uppercase fw-semibold">Last Recorded Ping</div>
                            <div className="fw-semibold text-dark fs-12 font-monospace mt-0.5">
                              {selected.last_gps_at ? formatRelativeTime(selected.last_gps_at) : 'Recent'}
                            </div>
                            {selected.current_speed != null && (
                              <div className="text-primary fs-11 fw-medium mt-0.5">
                                Speed: {selected.current_speed} km/h
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="d-flex flex-wrap gap-2 pt-2 border-top">
                          <button
                            type="button"
                            className="btn btn-sm btn-success text-white fw-bold d-inline-flex align-items-center gap-1 px-3 py-1.5 shadow-sm"
                            onClick={() => {
                              closeModal()
                              setTimeout(() => openModal('location', selected), 100)
                            }}
                          >
                            <i className="ri-map-pin-line" />
                            <span>Track on Interactive Map</span>
                          </button>

                          <a
                            href={`https://www.google.com/maps?q=${selected.current_lat},${selected.current_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 py-1.5"
                          >
                            <i className="ri-google-fill" />
                            <span>Open in Google Maps</span>
                            <i className="ri-external-link-line fs-11" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-white rounded border text-muted fs-12">
                        <i className="ri-information-line me-1 text-primary" />
                        No live GPS signal received yet. The courier needs to be logged into the Bems Courier app with location enabled.
                      </div>
                    )}
                  </div>

                  {/* Driver Wallet & Payout Account Summary */}
                  <div className="border rounded-3 p-3.5 mb-4 bg-light-subtle">
                    <div className="d-flex align-items-center justify-content-between mb-2.5 pb-2 border-bottom">
                      <span className="fw-bold fs-13 text-dark d-flex align-items-center gap-1.5">
                        <i className="ri-wallet-3-line text-emerald fs-16" />
                        Driver Internal Earnings Wallet &amp; Payouts
                      </span>
                      {selected.payout_locked || selected.wallet_is_frozen ? (
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle fs-11">
                          <i className="ri-lock-2-line me-1" />Payouts Restricted / Locked
                        </span>
                      ) : (
                        <span className="badge bg-emerald-subtle text-emerald fs-11">Internal Wallet Active</span>
                      )}
                    </div>

                    {/* Security Payout Lock Alert Banner */}
                    {(selected.payout_locked || selected.wallet_is_frozen || (selected.pin_failed_attempts >= 5)) && (
                      <div className="alert alert-danger border-danger d-flex align-items-center justify-content-between p-3 mb-3 rounded-2 shadow-xs">
                        <div>
                          <div className="fw-bold text-dark fs-13 d-flex align-items-center gap-1.5">
                            <i className="ri-error-warning-fill text-danger fs-16" />
                            Payouts &amp; Cashouts Locked
                          </div>
                          <div className="text-muted fs-11 mt-0.5">
                            {selected.payout_locked_reason || selected.wallet_frozen_reason || 'Security lock active: Exceeded maximum PIN attempts.'}
                            {selected.pin_failed_attempts > 0 && ` (${selected.pin_failed_attempts} failed PIN attempt${selected.pin_failed_attempts === 1 ? '' : 's'})`}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger text-white fw-bold d-flex align-items-center gap-1 shadow-sm px-3 py-1.5"
                          disabled={unlockingPayout}
                          onClick={() => handleUnlockPayout(selected)}
                        >
                          <i className="ri-lock-unlock-line" />
                          <span>{unlockingPayout ? 'Unlocking…' : 'Unlock Payouts'}</span>
                        </button>
                      </div>
                    )}
                    
                    {/* Internal Wallet Details */}
                    <div className="bg-white p-2.5 rounded-2 border mb-2.5 d-flex align-items-center justify-content-between">
                      <div>
                        <div className="text-muted fs-11 text-uppercase fw-bold mb-0.5">
                          Internal Driver Wallet ID
                        </div>
                        <div className="fw-bold text-dark fs-14 font-monospace">
                          {selected.wallet_account_number || (`DRV-${String(selected.id).padStart(4, '0')}`)}
                        </div>
                        <div className="text-muted fs-11">
                          Bems Farms Internal Settlement Wallet
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="text-muted fs-11 text-uppercase fw-bold mb-0.5">
                          Wallet Earnings Balance
                        </div>
                        <div className="fw-bold text-emerald fs-15 font-monospace">
                          {fmt(selected.earnings || selected.total_earnings || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Zonal Delivery Earning Rate */}
                    <div className="mb-2.5 pb-2 border-bottom d-flex align-items-center justify-content-between">
                      <div>
                        <span className="text-muted fs-12 d-block">Earning Model</span>
                        <strong className="text-dark fs-13">
                          {selected.zone ? selected.zone : (selected.zone_id ? `Assigned Zone: ${selected.zone_id}` : 'Dynamic Zonal Pricing')}
                        </strong>
                      </div>
                      <div className="text-end">
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle fs-11 px-2 py-0.5">
                          Destination-Based Drop Payout
                        </span>
                        <div className="text-muted fs-11 mt-1 font-monospace fw-semibold text-dark">
                          {selected.zone_driver_earning_fee 
                            ? `${fmt(selected.zone_driver_earning_fee)} / drop`
                            : '₦700 – ₦5,600 / drop (by zone)'}
                        </div>
                      </div>
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
                        Driver Login &amp; Account Security
                      </span>
                      <span className="badge bg-success-subtle text-success fs-xs">Self-Service Protected</span>
                    </div>
                    <p className="text-muted mb-2.5" style={{ fontSize: 11, lineHeight: 1.5 }}>
                      Send official login instructions, account credentials overview, or a secure password reset link directly to the driver's verified email.
                    </p>
                    <div className="d-flex flex-column gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary w-100 fw-bold d-flex align-items-center justify-content-center gap-1.5 py-1.5"
                        disabled={!selected.email || resendingLoginEmail || updatingPassword}
                        onClick={handleResendLoginEmail}
                      >
                        <i className="ri-mail-send-line" />
                        <span>{resendingLoginEmail ? 'Sending Login Email…' : `Resend Login Email to ${selected.email || 'Driver'}`}</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary w-100 fw-semibold d-flex align-items-center justify-content-center gap-1.5 py-1.5"
                        disabled={!selected.email || updatingPassword || resendingLoginEmail}
                        onClick={handleSendPasswordResetLink}
                      >
                        <i className="ri-lock-password-line" />
                        <span>{updatingPassword ? 'Sending Reset Link…' : 'Send Password Reset Link'}</span>
                      </button>



                      {selected.onboarding_status === 'invited' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning w-100 fw-semibold d-flex align-items-center justify-content-center gap-1.5 py-1.5"
                          onClick={() => handleResendInvite(selected)}
                        >
                          <i className="ri-user-received-line" />
                          <span>Resend Onboarding Invitation Link</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      className="btn btn-sm fw-bold text-white d-flex align-items-center gap-1 shadow-sm"
                      style={{ background: '#059669', borderColor: '#059669' }}
                      onClick={() => {
                        const drvId = selected.id
                        closeModal()
                        setSelectedChatDriverId(drvId)
                        setTabMode('chat')
                        setSearchParams({ tab: 'chat', driverId: drvId }, { replace: true })
                      }}
                      title="Open Live Dispatch Chat with Courier"
                    >
                      <i className="ri-chat-3-line" />
                      <span>Message Courier</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm fw-semibold text-white d-flex align-items-center gap-1 shadow-sm"
                      style={{ background: '#0F766E', borderColor: '#0F766E' }}
                      onClick={() => openModal('statement', selected)}
                      title="View & Download Official Statement of Account"
                    >
                      <i className="ri-file-list-3-line" />
                      View Statement of Account
                    </button>
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
                    <label className="form-label fw-medium small d-flex justify-content-between align-items-center">
                      <span>Email Address {isEditing ? '' : '(Optional)'}</span>
                      {isEditing && (
                        <span className="text-muted" style={{ fontSize: 10 }}>
                          <i className="ri-lock-2-line me-1" />Immutable
                        </span>
                      )}
                    </label>
                    <input
                      className={`form-control ${isEditing ? 'bg-light text-muted' : ''}`}
                      type="email"
                      placeholder="e.g. samuel.okafor@gmail.com"
                      value={form.email}
                      disabled={isEditing}
                      readOnly={isEditing}
                      onChange={(e) => setField('email', e.target.value)}
                      title={isEditing ? 'Driver email address cannot be modified once registered' : ''}
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
                          placeholder="e.g. 4829"
                          value={form.password}
                          onChange={(e) => setField('password', e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => setField('password', Math.floor(1000 + Math.random() * 9000).toString())}
                        >
                          Generate 4-Digit PIN
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
                    <label className="form-label fw-medium small">Fallback Base Commission (₦)</label>
                    <input
                      className="form-control font-monospace"
                      type="number"
                      placeholder="500"
                      value={form.commission_per_delivery}
                      onChange={(e) => setField('commission_per_delivery', e.target.value)}
                    />
                    <div className="text-muted fs-10 mt-1">Driver earns by destination zone (₦700–₦5,600). Used only if order has no zone.</div>
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
                    This will permanently remove the driver profile, their internal wallet ledger, delivery records, and GPS tracking data.
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

          {/* ── 7. DRIVER LIVE GPS LOCATION & TELEMETRY MODAL ──────── */}
          {activeModal === 'location' && selected && (() => {
            const loc = locationData?.current_location || null
            const activeLat = loc?.latitude ?? selected.current_lat ?? null
            const activeLng = loc?.longitude ?? selected.current_lng ?? null
            const activeHeading = loc?.heading ?? selected.current_heading ?? 0
            const activeSpeed = loc?.speed ?? selected.current_speed ?? null
            const activeAccuracy = loc?.accuracy ?? selected.current_accuracy ?? null
            const activeRecordedAt = loc?.recorded_at ?? selected.last_gps_at ?? selected.last_telemetry_at ?? null
            const hasLiveGps = Boolean(loc?.is_gps_live ?? selected.is_gps_live ?? false)
            const hasCoordinates = activeLat != null && activeLng != null && !isNaN(Number(activeLat)) && !isNaN(Number(activeLng)) && Number(activeLat) !== 0 && Number(activeLng) !== 0
            const coords = hasCoordinates ? [Number(activeLat), Number(activeLng)] : null

            const trailCoords = Array.isArray(locationData?.trail)
              ? locationData.trail
                  .filter((t) => t.latitude != null && t.longitude != null && !isNaN(Number(t.latitude)) && !isNaN(Number(t.longitude)))
                  .map((t) => [Number(t.latitude), Number(t.longitude)])
              : []

            const activeDelivery = locationData?.active_delivery || null
            const custLat = activeDelivery?.customer_lat ? Number(activeDelivery.customer_lat) : null
            const custLng = activeDelivery?.customer_lng ? Number(activeDelivery.customer_lng) : null
            const activeDeliveryCustCoords = (custLat != null && custLng != null && custLat !== 0 && custLng !== 0) ? [custLat, custLng] : null

            return (
              <div
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  width: '100%',
                  maxWidth: 880,
                  maxHeight: '92vh',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
                className="shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div
                  style={{
                    background: '#0f172a',
                    padding: '18px 24px',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold fs-16"
                      style={{
                        width: 46,
                        height: 46,
                        background: hasLiveGps ? '#16a34a33' : '#334155',
                        border: `2px solid ${hasLiveGps ? '#22c55e' : '#64748b'}`,
                        color: hasLiveGps ? '#4ade80' : '#cbd5e1',
                      }}
                    >
                      {selected.name ? selected.name.split(' ').map((n) => n[0]).join('') : 'DR'}
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <h5 className="mb-0 fw-bold text-white fs-16">{selected.name}</h5>
                        {hasLiveGps ? (
                          <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-0.5 fs-10 d-inline-flex align-items-center gap-1">
                            <span className="spinner-grow spinner-grow-sm text-success" style={{ width: 6, height: 6 }} />
                            LIVE GPS STREAMING
                          </span>
                        ) : (
                          <span className="badge rounded-pill bg-secondary-subtle text-light border border-secondary px-2 py-0.5 fs-10">
                            LAST KNOWN FIX
                          </span>
                        )}
                      </div>
                      <div className="text-white-50 fs-11 mt-0.5 d-flex align-items-center gap-2">
                        <span>{selected.phone}</span>
                        <span>•</span>
                        <span className="text-capitalize">{selected.vehicle_type || 'Motorcycle'} ({selected.vehicle_plate || 'No plate'})</span>
                        <span>•</span>
                        <span>Zone: {selected.zone || 'Central Area'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-light d-flex align-items-center gap-1.5 px-2.5 py-1"
                      onClick={() => refreshDriverLocation(selected.id)}
                      disabled={loadingLocation}
                      title="Poll and refresh GPS telemetry now"
                    >
                      <i className={`ri-refresh-line ${loadingLocation ? 'ri-spin' : ''}`} />
                      <span className="fs-12">Refresh</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-light rounded-circle p-1 d-flex align-items-center justify-content-center"
                      style={{ width: 32, height: 32 }}
                      onClick={closeModal}
                    >
                      <i className="ri-close-line fs-18" />
                    </button>
                  </div>
                </div>

                {/* Map View */}
                <div style={{ position: 'relative', height: 420, width: '100%', background: '#f1f5f9' }}>
                  {hasCoordinates ? (
                    <MapContainer
                      center={coords}
                      zoom={15}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={true}
                    >
                      <MapCenterController center={coords} zoom={15} />
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {/* Accuracy radius ring */}
                      {activeAccuracy != null && activeAccuracy > 0 && (
                        <Circle
                          center={coords}
                          radius={Math.min(activeAccuracy, 150)}
                          pathOptions={{ fillColor: '#22c55e', fillOpacity: 0.12, color: '#16a34a', weight: 1, dashArray: '4, 4' }}
                        />
                      )}

                      {/* Courier Pin */}
                      <Marker
                        position={coords}
                        icon={createCourierPinIcon(selected.name, selected.vehicle_type, hasLiveGps, activeHeading)}
                      >
                        <Popup>
                          <div style={{ minWidth: 180, padding: 4 }}>
                            <strong className="fs-13 d-block text-dark">{selected.name}</strong>
                            <div className="text-muted fs-11">{selected.phone}</div>
                            <div className="fs-11 mt-1 font-monospace text-primary fw-semibold">
                              {Number(activeLat).toFixed(5)}°, {Number(activeLng).toFixed(5)}°
                            </div>
                            {activeSpeed != null && (
                              <div className="fs-11 fw-medium text-dark mt-0.5">
                                Speed: {activeSpeed} km/h
                              </div>
                            )}
                            <div className="text-muted fs-10 mt-1">
                              Recorded: {activeRecordedAt ? new Date(activeRecordedAt).toLocaleTimeString() : 'Recent'}
                            </div>
                          </div>
                        </Popup>
                      </Marker>

                      {/* Breadcrumb Trail */}
                      {trailCoords.length > 1 && (
                        <Polyline
                          positions={trailCoords}
                          pathOptions={{ color: '#0284c7', weight: 3, opacity: 0.7, dashArray: '6, 6' }}
                        />
                      )}

                      {/* Active Delivery Customer Destination Pin */}
                      {activeDeliveryCustCoords && (
                        <>
                          <Marker
                            position={activeDeliveryCustCoords}
                            icon={createCustomerPinIcon(activeDelivery.customer_name)}
                          >
                            <Popup>
                              <div style={{ minWidth: 180, padding: 4 }}>
                                <span className="badge bg-danger text-white fs-10 mb-1">Active Drop Destination</span>
                                <strong className="fs-13 d-block">{activeDelivery.customer_name}</strong>
                                <div className="text-muted fs-11">{activeDelivery.delivery_address}</div>
                                <div className="text-primary fs-11 fw-semibold mt-1">Order #{activeDelivery.order_id}</div>
                              </div>
                            </Popup>
                          </Marker>
                          <Polyline
                            positions={[coords, activeDeliveryCustCoords]}
                            pathOptions={{ color: '#16a34a', weight: 3, opacity: 0.8 }}
                          />
                        </>
                      )}

                      {/* Central Operations Hub */}
                      <Marker position={[5.5245, 7.4912]} icon={createHubPinIcon()}>
                        <Popup>
                          <div style={{ padding: 4 }}>
                            <strong className="fs-12 d-block">Bems Farms Central Hub</strong>
                            <span className="text-muted fs-11">Fulfillment & Operations Depot (Umuahia)</span>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  ) : (
                    <div className="h-100 d-flex flex-column align-items-center justify-content-center p-4 text-center bg-light">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center mb-3 text-muted"
                        style={{ width: 64, height: 64, background: '#e2e8f0' }}
                      >
                        <i className="ri-map-pin-off-line fs-28" />
                      </div>
                      <h6 className="fw-bold text-dark mb-1">No GPS Telemetry Signal Received</h6>
                      <p className="text-muted fs-12 mb-3" style={{ maxWidth: 420 }}>
                        {selected.name} has not transmitted GPS coordinates yet. The courier must open the Bems Courier App and enable GPS location permissions to transmit their live location.
                      </p>
                      <div className="d-flex gap-2 flex-wrap justify-content-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => refreshDriverLocation(selected.id)}
                          disabled={loadingLocation}
                        >
                          <i className={`ri-refresh-line me-1 ${loadingLocation ? 'ri-spin' : ''}`} /> Re-check GPS Fix
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={async () => {
                            try {
                              await api.post(`/admin/deliveries/drivers/${selected.id}/location`, {
                                latitude: 5.5245,
                                longitude: 7.4912,
                                heading: 0,
                                speed: 0,
                                accuracy: 5
                              })
                              toast.success(`Pinned ${selected.name} to Central Operations Hub`)
                              refreshDriverLocation(selected.id)
                              fetchDrivers()
                            } catch (err) {
                              toast.error('Failed to set location override')
                            }
                          }}
                        >
                          <i className="ri-map-pin-2-line me-1" /> Pin to Central Hub (Override)
                        </button>
                        {selected.phone && (
                          <a href={`tel:${selected.phone}`} className="btn btn-sm btn-success text-white">
                            <i className="ri-phone-line me-1" /> Call Driver ({selected.phone})
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Telemetry Metrics & Status HUD */}
                <div className="p-3 bg-white border-top">
                  <div className="row g-2 mb-3">
                    <div className="col-6 col-md-3">
                      <div className="border rounded-2 p-2.5 bg-light-subtle h-100">
                        <div className="text-muted fs-10 text-uppercase fw-bold mb-1 d-flex align-items-center justify-content-between">
                          <span>Exact Coordinates</span>
                          {hasCoordinates && (
                            <button
                              type="button"
                              className="btn btn-link p-0 text-primary text-decoration-none fs-10"
                              onClick={() => {
                                navigator.clipboard.writeText(`${activeLat}, ${activeLng}`)
                                toast.success('Coordinates copied to clipboard!')
                              }}
                              title="Copy Lat, Lng"
                            >
                              <i className="ri-file-copy-line" /> Copy
                            </button>
                          )}
                        </div>
                        <div className="fw-bold font-monospace text-dark fs-12">
                          {hasCoordinates ? `${Number(activeLat).toFixed(5)}°, ${Number(activeLng).toFixed(5)}°` : '—'}
                        </div>
                        <div className="text-muted fs-10 mt-0.5">
                          {hasCoordinates ? 'WGS84 High Precision' : 'GPS Offline'}
                        </div>
                      </div>
                    </div>

                    <div className="col-6 col-md-3">
                      <div className="border rounded-2 p-2.5 bg-light-subtle h-100">
                        <div className="text-muted fs-10 text-uppercase fw-bold mb-1">Speed &amp; Movement</div>
                        <div className="fw-bold text-dark fs-12">
                          {activeSpeed != null ? `${activeSpeed} km/h` : (hasCoordinates ? '0 km/h (Stationary)' : '—')}
                        </div>
                        <div className="text-muted fs-10 mt-0.5">
                          {activeSpeed > 0 ? 'Moving on Route' : (hasCoordinates ? 'Stationary / Idling' : 'No telemetry')}
                        </div>
                      </div>
                    </div>

                    <div className="col-6 col-md-3">
                      <div className="border rounded-2 p-2.5 bg-light-subtle h-100">
                        <div className="text-muted fs-10 text-uppercase fw-bold mb-1">Heading / Accuracy</div>
                        <div className="fw-bold text-dark fs-12 d-flex align-items-center gap-1">
                          <span>{activeHeading != null ? `${activeHeading}°` : 'Facing 0°'}</span>
                          {activeAccuracy != null && (
                            <span className="badge bg-secondary-subtle text-secondary py-0 px-1 font-monospace fs-9">
                              ±{Math.round(activeAccuracy)}m
                            </span>
                          )}
                        </div>
                        <div className="text-muted fs-10 mt-0.5">
                          {activeAccuracy != null && activeAccuracy <= 15 ? 'High Accuracy GPS' : 'Standard fix'}
                        </div>
                      </div>
                    </div>

                    <div className="col-6 col-md-3">
                      <div className="border rounded-2 p-2.5 bg-light-subtle h-100">
                        <div className="text-muted fs-10 text-uppercase fw-bold mb-1">Last Telemetry Ping</div>
                        <div className="fw-bold text-dark fs-12">
                          {activeRecordedAt ? formatRelativeTime(activeRecordedAt) : 'Never'}
                        </div>
                        <div className="text-muted fs-10 mt-0.5 font-monospace">
                          {activeRecordedAt ? new Date(activeRecordedAt).toLocaleTimeString() : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* External Map & Dispatch Quick Actions */}
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-2 border-top">
                    <div className="d-flex align-items-center gap-2">
                      {hasCoordinates && (
                        <a
                          href={`https://www.google.com/maps?q=${activeLat},${activeLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 fw-medium"
                        >
                          <i className="ri-google-fill" />
                          <span>Open in Google Maps</span>
                          <i className="ri-external-link-line fs-11" />
                        </a>
                      )}
                      <Link
                        to={`/deliveries/map?driverId=${selected.id}`}
                        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 fw-medium"
                      >
                        <i className="ri-map-2-line" />
                        <span>Open in Fleet Dispatch Map</span>
                      </Link>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      {selected.phone && (
                        <a
                          href={`tel:${selected.phone}`}
                          className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1"
                        >
                          <i className="ri-phone-line" />
                          <span>Call ({selected.phone})</span>
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-dark px-3"
                        onClick={closeModal}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Official Driver Statement of Account Modal */}
          {/* Official Driver Statement of Account Modal */}
          {activeModal === 'statement' && selected && (() => {
            const rawDriverName = selected.name || statementData?.driver?.name || 'Driver'
            const cleanDriverName = String(rawDriverName).replace(/[/\\:*?"<>|]/g, ' ').trim() || 'Driver'
            const documentFileName = `${cleanDriverName} Commission Statement of Account - Bems Farms`

            const handlePrintStatement = () => {
              printOfficialDocument(
                '.bems-doc-print-target',
                documentFileName
              )
            }

            return (
              <div className="bems-doc-modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', position: 'fixed', inset: 0, zIndex: 1060, overflowY: 'auto', padding: '24px 12px' }}>
                {/* Floating Control Bar */}
                <div className="no-print d-flex align-items-center justify-content-between mx-auto mb-3 px-3 py-2 bg-dark text-white rounded-3 shadow" style={{ maxWidth: 840 }}>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-success text-white px-2.5 py-1.5" style={{ fontSize: 12 }}>
                      <i className="ri-file-text-line me-1" />
                      OFFICIAL DRIVER STATEMENT OF ACCOUNT
                    </span>
                    <span className="text-white-50 small d-none d-sm-inline">
                      | {selected.name} ({selected.wallet_account_number || `DRV-${selected.id}`})
                    </span>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="btn btn-sm btn-primary fw-medium px-3 shadow-sm d-flex align-items-center gap-1"
                      onClick={handlePrintStatement}
                      title="Print or Save Official A4 PDF Document"
                    >
                      <i className="ri-printer-line" />
                      <span>Print / Save PDF (A4)</span>
                    </button>

                    <button
                      className="btn btn-sm btn-outline-light"
                      onClick={closeModal}
                      title="Close Statement Preview"
                    >
                      <i className="ri-close-line fs-16" />
                    </button>
                  </div>
                </div>

                {loadingStatement ? (
                  <div className="text-center py-5 text-white">
                    <i className="ri-loader-4-line ri-spin fs-1 mb-2 d-block text-success"></i>
                    <p className="fw-semibold">Compiling Audited Ledger & Generating Official Statement...</p>
                    <span className="text-white-50 small">Connecting to Bems Farms Logistics Ledger</span>
                  </div>
                ) : (
                  <>
                    <div className="bems-doc-print-target d-flex justify-content-center">
                      <BemsDriverStatementDocument
                        driver={statementData?.driver || selected}
                        summary={statementData?.summary || {}}
                        company={statementData?.company || {}}
                        statement={statementData?.statement || []}
                      />
                    </div>

                    <div className="no-print d-flex align-items-center justify-content-center gap-2 mx-auto mt-3 py-2 flex-wrap" style={{ maxWidth: 840 }}>
                      <button
                        className="btn btn-primary shadow fw-semibold px-4 d-flex align-items-center gap-1.5"
                        onClick={handlePrintStatement}
                      >
                        <i className="ri-printer-line" />
                        Print / Save A4 PDF
                      </button>
                      <button
                        className="btn btn-secondary shadow fw-semibold px-3"
                        onClick={closeModal}
                      >
                        Close Preview
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
