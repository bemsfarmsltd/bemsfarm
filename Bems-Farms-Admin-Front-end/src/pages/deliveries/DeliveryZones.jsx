import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const fmt  = (n) => `₦${Number(n || 0).toLocaleString()}`
const ETA_OPTIONS = ['15–30 mins', '30–45 mins', '45–60 mins', '60–90 mins', '1–2 hours', '2–3 hours', 'Same Day (3–5 hours)', 'Next Day Dispatch', '2–3 Business Days', '3–5 Business Days']

const DRIVER_STATUS_COLOR = {
  on_delivery: '#3b82f6',
  active:      '#22c55e',
  off_duty:    '#6b7280',
  suspended:   '#ef4444',
}

const HUB_PRESETS = [
  { name: 'Umuahia Hub (Home Base)', lat: 5.5245, lng: 7.4912, radius: 25, areas: 'World Bank Housing, Ossah Road, Bende Road, BCA Area, Isi Gate, Umudike', color: '#1B4332' },
  { name: 'Aba Commercial Hub', lat: 5.1065, lng: 7.3667, radius: 35, areas: 'Ariaria International, Faulks Road, Aba Owerri Road, Ogbor Hill, Osisioma, Eziukwu', color: '#059669' },
  { name: 'Port Harcourt Hub', lat: 4.8156, lng: 7.0498, radius: 40, areas: 'GRA Phase 2, Peter Odili Road, Trans-Amadi, Rumuokoro, Woji, Ada George', color: '#2563EB' },
  { name: 'Owerri Hub', lat: 5.4836, lng: 7.0332, radius: 30, areas: 'Ikenegbu, Aladinma, New Owerri, World Bank Owerri, Works Layout, Douglas', color: '#7C3AED' },
  { name: 'Enugu Hub', lat: 6.4584, lng: 7.5464, radius: 35, areas: 'Independence Layout, New Haven, GRA Enugu, Ogui Road, Abakpa, Trans-Ekulu', color: '#D97706' },
  { name: 'Lagos State Hub', lat: 6.5244, lng: 3.3792, radius: 80, areas: 'Ikeja, Victoria Island, Lekki Phase 1, Ikoyi, Surulere, Yaba, Maryland', color: '#DC2626' },
  { name: 'Abuja FCT Hub', lat: 9.0765, lng: 7.3986, radius: 60, areas: 'Wuse 2, Maitama, Garki, Gwarinpa, Jabi, Utako, Asokoro, Central Area', color: '#0891B2' },
]

const BLANK_FORM = {
  name: '', eta: ETA_OPTIONS[1], fee: '', minOrder: '', active: true,
  driverIds: [], areas: '', notes: '',
  driver_earning_fee: '', driver_commission_percent: 70,
  center_lat: 5.5245, center_lng: 7.4912, radius_km: 25, color_hex: '#1B4332',
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

  // Geocoding search state in modal
  const [geoQuery, setGeoQuery]         = useState('')
  const [geoResults, setGeoResults]     = useState([])
  const [geoSearching, setGeoSearching] = useState(false)
  const [showGeoDropdown, setShowGeoDropdown] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/deliveries/zones')
      setZones((res.data.zones || []).map(z => {
        let areas = []
        if (Array.isArray(z.coverage_areas)) {
          areas = z.coverage_areas
        } else if (typeof z.coverage_areas === 'string') {
          try {
            const parsed = JSON.parse(z.coverage_areas)
            areas = Array.isArray(parsed) ? parsed : [z.coverage_areas]
          } catch {
            areas = z.coverage_areas.split(',').map(a => a.trim()).filter(Boolean)
          }
        }
        return {
          id: z.id,
          name: z.zone_name,
          eta: z.estimated_eta || ETA_OPTIONS[1],
          fee: Number(z.delivery_fee || 0),
          minOrder: Number(z.min_order_amount || 0),
          driver_earning_fee: Number(z.driver_earning_fee || Math.round(Number(z.delivery_fee || 0) * 0.70)),
          driver_commission_percent: Number(z.driver_commission_percent || 70),
          active: !!z.is_active,
          driverIds: z.driver_ids || [],
          areas,
          center_lat: z.center_lat !== null && z.center_lat !== undefined ? Number(z.center_lat) : null,
          center_lng: z.center_lng !== null && z.center_lng !== undefined ? Number(z.center_lng) : null,
          radius_km: z.radius_km !== null && z.radius_km !== undefined ? Number(z.radius_km) : 25,
          color_hex: z.color_hex || '#1B4332',
          notes: z.notes || '',
          deliveries: Number(z.deliveries || 0),
          revenue: Number(z.revenue || 0),
        }
      }))
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
    setGeoQuery('')
    setGeoResults([])
    setShowGeoDropdown(false)

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

  // Handle Hub Location Geocode Search
  const handleGeoSearch = async (val) => {
    setGeoQuery(val)
    if (!val || val.trim().length < 2) {
      setGeoResults([])
      setShowGeoDropdown(false)
      return
    }

    setGeoSearching(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val.trim() + ', Nigeria')}&countrycodes=ng&addressdetails=1&limit=5`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const data = await res.json()
      if (Array.isArray(data)) {
        setGeoResults(data)
        setShowGeoDropdown(true)
      }
    } catch {
      // Fallback
    } finally {
      setGeoSearching(false)
    }
  }

  const selectGeoResult = (item) => {
    const lat = parseFloat(item.lat)
    const lon = parseFloat(item.lon)
    setForm(p => ({
      ...p,
      center_lat: Math.round(lat * 10000) / 10000,
      center_lng: Math.round(lon * 10000) / 10000,
      name: p.name || item.name || (item.display_name ? item.display_name.split(',')[0] : ''),
    }))

    // Append to areas if not already there
    const areaName = item.name || (item.display_name ? item.display_name.split(',')[0] : '')
    if (areaName && !areasInput.toLowerCase().includes(areaName.toLowerCase())) {
      setAreasInput(prev => prev ? `${prev}, ${areaName}` : areaName)
    }

    setGeoQuery(item.display_name)
    setShowGeoDropdown(false)
    toast.success(`📍 Center pinned: ${lat.toFixed(4)}, ${lon.toFixed(4)}`)
  }

  const applyPreset = (preset) => {
    setForm(p => ({
      ...p,
      name: p.name || preset.name,
      center_lat: preset.lat,
      center_lng: preset.lng,
      radius_km: preset.radius,
      color_hex: preset.color,
    }))
    setAreasInput(preset.areas)
    toast.success(`Applied ${preset.name} (${preset.radius} km radius)`)
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
        zone_name: form.name,
        delivery_fee: Number(form.fee),
        min_order_amount: Number(form.minOrder),
        driver_earning_fee: Number(form.driver_earning_fee || Math.round(Number(form.fee || 0) * 0.70)),
        driver_commission_percent: Number(form.driver_commission_percent || 70),
        estimated_eta: form.eta,
        coverage_areas: areas,
        driver_ids: form.driverIds,
        notes: form.notes || undefined,
        is_active: form.active,
        center_lat: form.center_lat !== null && form.center_lat !== undefined ? Number(form.center_lat) : null,
        center_lng: form.center_lng !== null && form.center_lng !== undefined ? Number(form.center_lng) : null,
        radius_km: form.radius_km !== null && form.radius_km !== undefined ? Number(form.radius_km) : 25,
        color_hex: form.color_hex || '#1B4332',
      }
      if (isEditing) {
        await api.patch(`/admin/deliveries/zones/${selected.id}`, payload)
        toast.success('Zone updated successfully')
      } else {
        await api.post('/admin/deliveries/zones', payload)
        toast.success('Zone created successfully')
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
    <div className="container-fluid py-2">

      {/* Page Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold fs-18">Delivery Coverage Zones</h6>
          <p className="text-muted small mb-0 mt-0.5">
            Geofenced fulfillment hubs, automated radius matching, and dispatch fee boundaries.
          </p>
        </div>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/deliveries/active">Deliveries</Link></li>
          <li className="breadcrumb-item active">Zones &amp; Radius Mapping</li>
        </ul>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Zones',
            value: stats.total,
            glow: 'bg-card-glow-indigo',
            iconBg: '#EEF2FF',
            iconColor: '#4F46E5',
            icon: 'ri-map-2-line',
            subLeft: 'Configured Geofences',
            subRight: `${stats.total} Zones`
          },
          {
            label: 'Active Coverage',
            value: stats.active,
            glow: 'bg-card-glow-green',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            icon: 'ri-checkbox-circle-line',
            subLeft: 'Live Dispatch Enabled',
            subRight: `${stats.active} Online`
          },
          {
            label: 'Inactive Zones',
            value: stats.inactive,
            glow: 'bg-card-glow-red',
            iconBg: '#FFF1F2',
            iconColor: '#E11D48',
            icon: 'ri-close-circle-line',
            subLeft: 'Temporarily Paused',
            subRight: `${stats.inactive} Offline`
          },
          {
            label: 'Total Deliveries',
            value: stats.totalDeliveries,
            glow: 'bg-card-glow-blue',
            iconBg: '#EFF6FF',
            iconColor: '#2563EB',
            icon: 'ri-truck-line',
            subLeft: 'Fulfilled Orders',
            subRight: 'Across All Zones'
          },
          {
            label: 'Zone Revenue',
            value: fmt(stats.totalRevenue),
            glow: 'bg-card-glow-teal',
            iconBg: '#F0FDFA',
            iconColor: '#0D9488',
            icon: 'ri-money-dollar-circle-line',
            subLeft: 'Logistics Gross',
            subRight: 'Delivery Earnings'
          },
          {
            label: 'Avg Delivery Fee',
            value: fmt(stats.avgFee),
            glow: 'bg-card-glow-amber',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            icon: 'ri-price-tag-3-line',
            subLeft: 'Tariff Benchmark',
            subRight: 'Per Dropoff'
          },
        ].map(c => (
          <div key={c.label} className="col-12 col-sm-6 col-xl-4 col-xxl-2">
            <div className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${c.glow}`}>
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


      {/* Filter + Actions bar */}
      <div className="card mb-3 shadow-xs">
        <div className="card-body d-flex flex-wrap gap-2 align-items-center">
          <div className="input-group" style={{ maxWidth: 280 }}>
            <span className="input-group-text"><i className="ri-search-line" /></span>
            <input className="form-control" placeholder="Search zone name, radius, area..."
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
            <button className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1.5" onClick={() => openModal('add')}>
              <i className="ri-add-line fs-16" /> + Add New Zone
            </button>
          </div>
        </div>
      </div>

      {/* Zone Cards Grid */}
      <div className="row g-3">
        {loading && (
          <div className="col-12"><div className="card p-5 text-center text-muted">Loading zones &amp; geofence boundaries…</div></div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="col-12">
            <div className="card p-5 text-center text-muted">No matching zones found</div>
          </div>
        )}
        {!loading && filtered.map(zone => {
          const assignedDrivers = drivers.filter(d => zone.driverIds.includes(d.id))
          const hasCoords = zone.center_lat !== null && zone.center_lng !== null

          return (
            <div key={zone.id} className="col-12 col-md-6 col-xl-4">
              <div className="card h-100 shadow-xs border" style={{ borderTop: `4px solid ${zone.color_hex || (zone.active ? '#22c55e' : '#ef4444')}` }}>
                <div className="card-body">
                  {/* Header */}
                  <div className="d-flex align-items-start justify-content-between mb-2">
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle" style={{ width: 10, height: 10, background: zone.color_hex || '#1B4332' }} />
                        <div className="fw-bold fs-16 text-dark">{zone.name}</div>
                      </div>
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
                      <ul className="dropdown-menu shadow-lg border" style={{ display: 'none', position: 'absolute', right: 0, top: '100%', zIndex: 10, minWidth: 160 }}>
                        <li><button className="dropdown-item small" onClick={() => openModal('view', zone)}><i className="ri-eye-line me-2" />View Details</button></li>
                        <li><button className="dropdown-item small" onClick={() => openModal('edit', zone)}><i className="ri-edit-line me-2" />Edit Zone &amp; Map</button></li>
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

                  {/* Geographic Radius Badge */}
                  <div className="mb-3 p-2 rounded-2 d-flex align-items-center justify-content-between" style={{ background: '#f8faf9', border: '1px solid #e5e7eb' }}>
                    <div className="d-flex align-items-center gap-1.5 text-truncate">
                      <i className="ri-map-pin-2-fill fs-14" style={{ color: zone.color_hex || '#1B4332' }} />
                      <span className="small fw-semibold text-secondary text-truncate" style={{ fontSize: 11 }}>
                        {hasCoords ? `${zone.center_lat.toFixed(4)}, ${zone.center_lng.toFixed(4)}` : 'Nationwide / Wide Area'}
                      </span>
                    </div>
                    <span className="badge bg-white text-dark border px-2 py-1 flex-shrink-0" style={{ fontSize: 10, fontWeight: 700 }}>
                      <i className="ri-radar-line me-1 text-primary" />{zone.radius_km || 25} km radius
                    </span>
                  </div>

                  {/* Fee / Min Order / Deliveries */}
                  <div className="d-flex gap-2 mb-3">
                    <div className="border rounded p-2 flex-fill text-center bg-light">
                      <div className="fw-bold fs-15 text-primary">{fmt(zone.fee)}</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Delivery Fee</div>
                    </div>
                    <div className="border rounded p-2 flex-fill text-center bg-light">
                      <div className="fw-bold fs-15">{fmt(zone.minOrder)}</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Min. Order</div>
                    </div>
                    <div className="border rounded p-2 flex-fill text-center bg-light">
                      <div className="fw-bold fs-15 text-success">{zone.deliveries}</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Deliveries</div>
                    </div>
                  </div>

                  {/* Coverage Areas */}
                  <div className="mb-3">
                    <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Coverage Area Keywords</div>
                    <div className="d-flex flex-wrap gap-1">
                      {zone.areas.slice(0, 4).map(a => (
                        <span key={a} className="badge bg-light text-dark border" style={{ fontSize: 10, fontWeight: 500 }}>{a}</span>
                      ))}
                      {zone.areas.length > 4 && (
                        <span className="badge bg-light text-muted border" style={{ fontSize: 10 }}>+{zone.areas.length - 4} more</span>
                      )}
                    </div>
                  </div>

                  {/* Assigned Drivers */}
                  <div className="mb-3">
                    <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>Assigned Fleet Drivers</div>
                    {assignedDrivers.length === 0
                      ? <div className="text-warning small" style={{ fontSize: 11 }}><i className="ri-alert-line me-1" />No driver assigned</div>
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
                    <div className="p-2 rounded small mb-1" style={{ background: '#fffbeb', borderLeft: '3px solid #f59e0b', fontSize: 11, color: '#92400e' }}>
                      {zone.notes}
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="card-footer bg-transparent d-flex gap-2 pt-2">
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(3px)' }}
          onClick={e => e.target === e.currentTarget && closeModal()}>

          {/* ── VIEW ZONE DETAILS ─────────────────────── */}
          {activeModal === 'view' && selected && (() => {
            const assignedDrivers = drivers.filter(d => selected.driverIds.includes(d.id))
            const hasCoords = selected.center_lat !== null && selected.center_lng !== null
            return (
              <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }} className="shadow-2xl">
                <div style={{ background: selected.color_hex || '#1B4332', borderRadius: '16px 16px 0 0', padding: '24px 28px', color: '#fff' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-bold fs-18">{selected.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.85 }} className="mt-1">
                        <i className="ri-radar-line me-1" />{selected.radius_km || 25} km Operational Radius ·
                        <span className={`ms-2 badge ${selected.active ? 'bg-success' : 'bg-danger'}`}>{selected.active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline-light" onClick={closeModal}><i className="ri-close-line" /></button>
                  </div>
                </div>
                <div className="p-4">
                  {/* Coordinates Info */}
                  <div className="p-3 rounded-3 mb-4 d-flex justify-content-between align-items-center" style={{ background: '#f8faf9', border: '1px solid #e5e7eb' }}>
                    <div>
                      <div className="text-muted" style={{ fontSize: 11 }}>Geographic Center Hub</div>
                      <div className="fw-bold text-dark fs-14">
                        {hasCoords ? `📍 ${selected.center_lat}, ${selected.center_lng}` : 'Unset / Nationwide'}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="text-muted" style={{ fontSize: 11 }}>Auto-Mapping Match</div>
                      <div className="badge bg-primary text-white" style={{ fontSize: 11 }}>
                        Within {selected.radius_km || 25} km
                      </div>
                    </div>
                  </div>

                  {/* KPIs */}
                  <div className="row g-3 mb-4">
                    {[
                      { label: 'Delivery Fee',  value: fmt(selected.fee),      color: '#3b82f6' },
                      { label: 'Min. Order',    value: fmt(selected.minOrder), color: '#6366f1' },
                      { label: 'Total Orders',  value: selected.deliveries,    color: '#22c55e' },
                      { label: 'Zone Revenue',  value: fmt(selected.revenue),  color: '#10b981' },
                    ].map(k => (
                      <div key={k.label} className="col-6">
                        <div className="border rounded-3 p-3 text-center bg-light">
                          <div className="fw-bold fs-16" style={{ color: k.color }}>{k.value}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{k.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Areas */}
                  <div className="mb-4">
                    <div className="fw-bold small mb-2 text-dark">Coverage Areas &amp; Landmarks</div>
                    <div className="d-flex flex-wrap gap-1">
                      {selected.areas.map(a => (
                        <span key={a} className="badge bg-light text-dark border px-2.5 py-1.5" style={{ fontSize: 11, fontWeight: 500 }}>{a}</span>
                      ))}
                    </div>
                  </div>

                  {/* Drivers */}
                  <div className="mb-4">
                    <div className="fw-bold small mb-2 text-dark">Assigned Drivers ({assignedDrivers.length})</div>
                    {assignedDrivers.length === 0
                      ? <div className="alert alert-warning small p-2.5 mb-0"><i className="ri-alert-line me-1" />No driver assigned to this zone.</div>
                      : assignedDrivers.map(d => (
                        <div key={d.id} className="d-flex align-items-center gap-2 border rounded-3 p-2 mb-2 bg-light">
                          <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: 32, height: 32, background: (DRIVER_STATUS_COLOR[d.status] || '#6b7280') + '20', color: DRIVER_STATUS_COLOR[d.status] || '#6b7280', fontSize: 11, fontWeight: 700 }}>
                            {d.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-grow-1 fw-semibold small">{d.name}</div>
                          <span className="badge" style={{ background: (DRIVER_STATUS_COLOR[d.status] || '#6b7280') + '20', color: DRIVER_STATUS_COLOR[d.status] || '#6b7280', fontSize: 10 }}>
                            {(d.status || '').replace('_', ' ')}
                          </span>
                        </div>
                      ))
                    }
                  </div>

                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-primary btn-sm flex-fill"
                      onClick={() => { closeModal(); setTimeout(() => openModal('edit', selected), 100) }}>
                      <i className="ri-edit-line me-1" />Edit Zone &amp; Radius
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

          {/* ── ADD / EDIT ZONE MODAL (WITH GEOGRAPHIC RADIUS MAPPING) ───────────────────────── */}
          {(activeModal === 'add' || activeModal === 'edit') && (
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto' }} className="shadow-2xl">
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom bg-light" style={{ borderRadius: '16px 16px 0 0' }}>
                <div>
                  <h5 className="mb-0 fw-bold">{isEditing ? `Edit Zone: ${selected?.name}` : '📍 Add Geofenced Delivery Zone'}</h5>
                  <p className="text-muted small mb-0 mt-0.5">Define hub coordinates, operational radius, and automated address matching rules.</p>
                </div>
                <button className="btn btn-sm btn-outline-secondary" onClick={closeModal}><i className="ri-close-line" /></button>
              </div>

              <div className="p-4">
                {/* 1. Quick Presets */}
                <div className="mb-4">
                  <label className="form-label fw-bold small text-secondary">1. QUICK REGIONAL PRESETS (OPTIONAL)</label>
                  <div className="d-flex flex-wrap gap-1.5">
                    {HUB_PRESETS.map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="btn btn-xs btn-outline-secondary rounded-pill py-1 px-2.5 text-dark"
                        style={{ fontSize: 11 }}
                      >
                        📍 {p.name.split(' ')[0]} ({p.radius}km)
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Location Autocomplete Search */}
                <div className="mb-4 position-relative">
                  <label className="form-label fw-bold small text-secondary">2. SEARCH &amp; PIN CENTER HUB LOCATION</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><i className="ri-search-2-line text-primary" /></span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type a city, market, or landmark to pin (e.g. Faulks Road Aba, Umuahia, Wuse 2 Abuja)..."
                      value={geoQuery}
                      onChange={e => handleGeoSearch(e.target.value)}
                    />
                    {geoSearching && <span className="input-group-text bg-white"><div className="spinner-border spinner-border-sm text-primary" /></span>}
                  </div>

                  {/* Dropdown Results */}
                  {showGeoDropdown && geoResults.length > 0 && (
                    <div className="position-absolute w-100 bg-white border rounded-3 shadow-lg mt-1 p-2" style={{ zIndex: 1060, maxHeight: 220, overflowY: 'auto' }}>
                      {geoResults.map((r, i) => (
                        <div
                          key={i}
                          onClick={() => selectGeoResult(r)}
                          className="p-2 rounded hover-bg-light cursor-pointer border-bottom last-border-none"
                          style={{ cursor: 'pointer', fontSize: 12 }}
                        >
                          <div className="fw-bold text-dark">{r.name || r.display_name.split(',')[0]}</div>
                          <div className="text-muted text-truncate" style={{ fontSize: 10 }}>{r.display_name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Geographic Coordinates & Dynamic Radius Visualizer */}
                <div className="p-3 rounded-3 mb-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold small text-dark">
                      <i className="ri-compass-3-line me-1 text-success" />
                      Fulfillment Hub Center &amp; Radius
                    </span>
                    <span className="badge bg-success px-2.5 py-1">
                      {form.radius_km || 25} km Coverage Radius
                    </span>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small text-muted mb-1" style={{ fontSize: 11 }}>Center Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        className="form-control form-control-sm bg-white"
                        placeholder="e.g. 5.5245"
                        value={form.center_lat ?? ''}
                        onChange={e => setField('center_lat', parseFloat(e.target.value) || null)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small text-muted mb-1" style={{ fontSize: 11 }}>Center Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        className="form-control form-control-sm bg-white"
                        placeholder="e.g. 7.4912"
                        value={form.center_lng ?? ''}
                        onChange={e => setField('center_lng', parseFloat(e.target.value) || null)}
                      />
                    </div>
                  </div>

                  {/* Radius Slider */}
                  <div className="mb-2">
                    <div className="d-flex justify-content-between small text-muted mb-1" style={{ fontSize: 11 }}>
                      <span>Operational Distance Radius:</span>
                      <strong className="text-dark">{form.radius_km || 25} km (Diameter: {(form.radius_km || 25) * 2} km)</strong>
                    </div>
                    <input
                      type="range"
                      className="form-range"
                      min="2"
                      max="150"
                      step="1"
                      value={form.radius_km || 25}
                      onChange={e => setField('radius_km', parseInt(e.target.value, 10))}
                    />
                    <div className="d-flex justify-content-between text-muted" style={{ fontSize: 9 }}>
                      <span>2 km (Local Neighborhood)</span>
                      <span>25 km (Metro City)</span>
                      <span>50 km (Suburban Area)</span>
                      <span>150 km (Regional)</span>
                    </div>
                  </div>

                  {/* Dynamic Visual Geofence Preview Box */}
                  <div className="p-2.5 rounded-2 bg-white border mt-2 d-flex align-items-center justify-content-between">
                    <div className="small" style={{ fontSize: 11 }}>
                      <span className="text-muted">Smart Routing Rule: </span>
                      <strong className="text-dark">
                        Addresses with GPS $\le$ {form.radius_km || 25} km of ({form.center_lat || '5.5245'}, {form.center_lng || '7.4912'}) auto-map to this zone.
                      </strong>
                    </div>
                    <input
                      type="color"
                      value={form.color_hex || '#1B4332'}
                      onChange={e => setField('color_hex', e.target.value)}
                      title="Zone Map Color"
                      style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }}
                    />
                  </div>
                </div>

                {/* 4. Zone General Information */}
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-medium small">Zone Display Name *</label>
                    <input className="form-control" placeholder="e.g. Aba Commercial Hub & Suburbs"
                      value={form.name} onChange={e => setField('name', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Customer Delivery Fee (₦) *</label>
                    <input className="form-control" type="number" placeholder="e.g. 2500"
                      value={form.fee} onChange={e => {
                        const fee = e.target.value
                        const pct = form.driver_commission_percent || 70
                        const drvFee = fee ? Math.round(Number(fee) * (Number(pct) / 100)) : ''
                        setForm(p => ({ ...p, fee, driver_earning_fee: drvFee }))
                      }} />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Driver Payout Earning (₦) *</label>
                    <input className="form-control" type="number" placeholder="e.g. 1750"
                      value={form.driver_earning_fee ?? ''} onChange={e => {
                        const drvFee = e.target.value
                        const fee = Number(form.fee) || 1
                        const pct = drvFee ? Math.round((Number(drvFee) / fee) * 100) : 70
                        setForm(p => ({ ...p, driver_earning_fee: drvFee, driver_commission_percent: pct }))
                      }} />
                    <div className="text-muted small mt-0.5" style={{ fontSize: 10 }}>
                      Automatic driver drop commission ({form.driver_commission_percent || 70}% share)
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Minimum Order Amount (₦) *</label>
                    <input className="form-control" type="number" placeholder="e.g. 5000"
                      value={form.minOrder} onChange={e => setField('minOrder', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Estimated Delivery SLA / ETA</label>
                    <select className="form-select" value={form.eta} onChange={e => setField('eta', e.target.value)}>
                      {ETA_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-medium small">Zone Status</label>
                    <select className="form-select" value={form.active ? 'active' : 'inactive'}
                      onChange={e => setField('active', e.target.value === 'active')}>
                      <option value="active">Active (Available for auto-mapping)</option>
                      <option value="inactive">Inactive / Disabled</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-medium small">
                      Coverage Area Keywords / Landmarks <span className="text-muted">(comma-separated)</span>
                    </label>
                    <input className="form-control" placeholder="e.g. Ariaria International, Faulks Road, Aba Owerri Road, Ogbor Hill"
                      value={areasInput} onChange={e => setAreasInput(e.target.value)} />
                    <div className="text-muted mt-1" style={{ fontSize: 10 }}>
                      Used as secondary fallback for keyword matching when coordinates are outside the primary GPS radius.
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-medium small">Assign Fleet Drivers</label>
                    <div className="border rounded p-3 bg-light" style={{ maxHeight: 140, overflowY: 'auto' }}>
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
                    <label className="form-label fw-medium small">Internal Notes (Optional)</label>
                    <textarea className="form-control" rows={2}
                      placeholder="e.g. Regional express dispatch from Umuahia to Aba..."
                      value={form.notes} onChange={e => setField('notes', e.target.value)} />
                  </div>
                </div>

                <div className="d-flex gap-2 mt-4 pt-2 border-top">
                  <button className="btn btn-outline-secondary flex-fill" onClick={closeModal}>Cancel</button>
                  <button className="btn btn-primary flex-fill" onClick={saveZone}
                    disabled={!form.name || !form.fee || form.fee === '' || saving}>
                    <i className={`${isEditing ? 'ri-save-line' : 'ri-add-line'} me-1`} />
                    {saving ? 'Saving…' : (isEditing ? 'Save Changes & Update Map' : 'Create & Map Zone')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── DELETE CONFIRM ────────────────────────── */}
          {activeModal === 'delete' && selected && (
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400 }} className="shadow-2xl">
              <div className="p-4">
                <div className="text-center mb-4">
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: 56, height: 56, background: '#fee2e2' }}>
                    <i className="ri-delete-bin-line fs-24 text-danger" />
                  </div>
                  <h5 className="mb-1 fw-bold">Delete Zone?</h5>
                  <p className="text-muted small mb-0">
                    Are you sure you want to delete <strong>{selected.name}</strong>?
                    Addresses mapped to this zone will fall back to the default regional zone.
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
