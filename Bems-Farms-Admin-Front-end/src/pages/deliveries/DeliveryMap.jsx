import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import toast from 'react-hot-toast'
import api from '../../lib/api'

// ─── Fix Leaflet default marker icons in Vite ─────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Bems Farms Hubs
const HUBS = [
  { id: 'aba', name: 'Bems Farms Aba Commercial Depot', city: 'Aba', coords: [5.1065, 7.3667], type: 'depot' },
  { id: 'umuahia', name: 'Bems Farms HQ Distribution Center', city: 'Umuahia', coords: [5.5245, 7.4912], type: 'hq' },
]
const DEFAULT_CENTER = [5.115, 7.368] // Aba central view

const STATUS_CFG = {
  assigned:           { label: 'Awaiting Pickup',   color: '#0891b2', bg: '#cffafe', border: '#a5f3fc', pulse: false, icon: 'ri-user-location-line' },
  awaiting_pickup:     { label: 'Awaiting Pickup',   color: '#0891b2', bg: '#cffafe', border: '#a5f3fc', pulse: false, icon: 'ri-user-location-line' },
  en_route:            { label: 'En Route',          color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe', pulse: true,  icon: 'ri-truck-line' },
  out_for_delivery:    { label: 'En Route',          color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe', pulse: true,  icon: 'ri-truck-line' },
  delivery_attempted:  { label: 'Attempted',         color: '#ea580c', bg: '#ffedd5', border: '#fed7aa', pulse: false, icon: 'ri-error-warning-line' },
}
const DEFAULT_STATUS_CFG = { label: 'Active', color: '#4f46e5', bg: '#e0e7ff', border: '#c7d2fe', pulse: false, icon: 'ri-map-pin-user-line' }

const DRIVER_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#059669', '#d97706', '#db2777', '#4f46e5']
const colorFor = (id) => DRIVER_COLORS[Math.abs(Number(id) || 0) % DRIVER_COLORS.length]

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`

// Haversine distance in KM
function calcDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number((R * c).toFixed(1))
}

// Find closest hub
function getClosestHub(lat, lng) {
  if (!lat || !lng) return HUBS[0]
  let closest = HUBS[0]
  let minD = Infinity
  for (const h of HUBS) {
    const d = calcDistanceKm(lat, lng, h.coords[0], h.coords[1])
    if (d < minD) {
      minD = d
      closest = h
    }
  }
  return closest
}

// Generate realistic curved / dog-leg road waypoints for authentic GPS journey rendering
function interpolateRoute(start, end, curvature = 0.08) {
  if (!start || !end) return []
  const [lat1, lng1] = start
  const [lat2, lng2] = end
  const midLat = (lat1 + lat2) / 2
  const midLng = (lng1 + lng2) / 2
  const dLat = lat2 - lat1
  const dLng = lng2 - lng1
  // Perpendicular offset for realistic road path curvature
  const perpLat = -dLng * curvature
  const perpLng = dLat * curvature
  const ctrl1 = [lat1 + dLat * 0.33 + perpLat * 0.8, lng1 + dLng * 0.33 + perpLng * 0.8]
  const ctrl2 = [lat1 + dLat * 0.66 - perpLat * 0.5, lng1 + dLng * 0.66 - perpLng * 0.5]
  return [start, ctrl1, ctrl2, end]
}

// ── Custom Leaflet Icons ────────────────────────────────────────────────────────
function driverIcon(name, color, pulse, heading = 0) {
  const initials = (name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const pulseHtml = pulse
    ? `<span class="driver-live-pulse" style="--pulse-color:${color};"></span>`
    : ''
  return L.divIcon({
    className: 'custom-driver-marker-wrap',
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -25],
    html: `
      <div class="driver-marker-container">
        ${pulseHtml}
        <div class="driver-marker-avatar" style="background:${color};">
          <i class="ri-riding-line" style="font-size:16px;"></i>
        </div>
        <div class="driver-marker-badge" style="background:${color};">
          ${(name || 'Driver').split(' ')[0]} · ${initials}
        </div>
        <div class="driver-heading-dot" style="transform: rotate(${heading || 0}deg);">
          <span style="background:${color};"></span>
        </div>
      </div>`,
  })
}

function customerIcon(color, name) {
  const shortName = (name || 'Customer').split(' ')[0]
  return L.divIcon({
    className: 'custom-customer-marker-wrap',
    iconSize: [38, 48],
    iconAnchor: [19, 46],
    popupAnchor: [0, -48],
    html: `
      <div class="customer-marker-pin">
        <div class="customer-pin-body" style="border-color:${color};">
          <i class="ri-user-smile-fill" style="color:${color};font-size:15px;"></i>
        </div>
        <div class="customer-pin-tip" style="border-top-color:${color};"></div>
        <div class="customer-pin-pill" style="background:${color};">
          ${shortName}
        </div>
      </div>`,
  })
}

function storeIcon(title, subtitle, type = 'depot') {
  const isHQ = type === 'hq'
  const bg = isHQ ? '#166534' : '#1e293b'
  const icon = isHQ ? 'ri-plant-fill' : 'ri-store-3-fill'
  return L.divIcon({
    className: 'custom-hub-marker-wrap',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -26],
    html: `
      <div class="hub-marker-box" style="background:${bg};">
        <i class="${icon}" style="font-size:18px;color:#fff;"></i>
        <div class="hub-title">${title}</div>
      </div>`,
  })
}

// ── Map Pan/Bounds Controller ──────────────────────────────────────────────────
function MapCameraController({ target, bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 1.2 })
      } catch (err) {
        console.error('fitBounds failed:', err)
      }
    } else if (target) {
      map.flyTo(target, 15, { duration: 1.2 })
    }
  }, [target, bounds, map])
  return null
}

export default function DeliveryMap() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected]   = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [flyTarget, setFlyTarget] = useState(null)
  const [fitBoundsTarget, setFitBoundsTarget] = useState(null)
  const [refreshSec, setRefreshSec] = useState(10)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const load = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    try {
      const res = await api.get('/admin/deliveries/active')
      const list = res.data.deliveries || []
      setDeliveries(list)
      setLastUpdated(new Date())
      // Keep selected delivery refreshed if active
      if (selected) {
        const found = list.find(d => d.id === selected.id)
        if (found) setSelected(found)
      }
    } catch {
      toast.error('Failed to load active deliveries')
    } finally {
      setLoading(false)
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 500)
        toast.success('Live GPS positions refreshed')
      }
    }
  }, [selected])

  useEffect(() => {
    load()
    const id = setInterval(() => load(false), refreshSec * 1000)
    return () => clearInterval(id)
  }, [load, refreshSec])

  // Filtered deliveries for list
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      const matchSearch =
        !searchQuery ||
        (d.customer_name && d.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.driver_name && d.driver_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.order_id && String(d.order_id).toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.delivery_address && d.delivery_address.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'en_route' && (d.status === 'en_route' || d.status === 'out_for_delivery')) ||
        (statusFilter === 'awaiting' && (d.status === 'assigned' || d.status === 'awaiting_pickup')) ||
        (statusFilter === 'attempted' && d.status === 'delivery_attempted')

      return matchSearch && matchStatus
    })
  }, [deliveries, searchQuery, statusFilter])

  const handleSelectDelivery = (del) => {
    setSelected(del)
    if (del.driver_lat != null && del.driver_lng != null) {
      if (del.customer_lat != null && del.customer_lng != null) {
        // Fit driver + customer destination + nearest hub on screen
        const hub = getClosestHub(del.driver_lat, del.driver_lng)
        setFitBoundsTarget([
          [del.driver_lat, del.driver_lng],
          [del.customer_lat, del.customer_lng],
          hub.coords,
        ])
        setFlyTarget(null)
      } else {
        setFlyTarget([del.driver_lat, del.driver_lng])
        setFitBoundsTarget(null)
      }
    }
  }

  const handleClearSelection = () => {
    setSelected(null)
    setFlyTarget(null)
    setFitBoundsTarget(null)
  }

  // Active metrics
  const enRouteCount = deliveries.filter(d => d.status === 'en_route' || d.status === 'out_for_delivery').length
  const awaitingCount = deliveries.filter(d => d.status === 'assigned' || d.status === 'awaiting_pickup').length
  const attemptedCount = deliveries.filter(d => d.status === 'delivery_attempted').length

  return (
    <div className="container-fluid py-3" style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>

      {/* Embedded CSS for glowing realtime journey lines & radar pulses */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.85); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes route-flow {
          from { stroke-dashoffset: 48; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes radar-glow {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.6); }
          70% { box-shadow: 0 0 0 14px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
        .driver-marker-container {
          position: relative;
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .driver-live-pulse {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2.5px solid var(--pulse-color, #2563eb);
          animation: pulse-ring 1.6s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        .driver-marker-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 3px 12px rgba(0,0,0,0.35);
          border: 2.5px solid #ffffff;
          position: relative;
          z-index: 2;
        }
        .driver-marker-badge {
          position: absolute;
          bottom: -7px;
          left: 50%;
          transform: translateX(-50%);
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          padding: 1.5px 6px;
          border-radius: 10px;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.8);
          z-index: 3;
          letter-spacing: 0.3px;
        }
        .driver-heading-dot {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }
        .driver-heading-dot span {
          position: absolute;
          top: -4px;
          left: calc(50% - 3px);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          border: 1px solid #fff;
        }

        /* Customer destination marker */
        .customer-marker-pin {
          position: relative;
          width: 38px;
          height: 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .customer-pin-body {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 10px rgba(0,0,0,0.22);
          z-index: 2;
        }
        .customer-pin-tip {
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 10px solid #2563eb;
          margin-top: -3px;
          z-index: 1;
        }
        .customer-pin-pill {
          position: absolute;
          top: -8px;
          color: #fff;
          font-size: 8.5px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
          white-space: nowrap;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          z-index: 3;
          max-width: 75px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Hub marker */
        .hub-marker-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          border: 2px solid #ffffff;
          padding: 2px;
        }
        .hub-title {
          font-size: 7px;
          font-weight: 800;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          text-align: center;
          line-height: 1.1;
          margin-top: 1px;
        }

        /* Animated live transit polyline */
        .leaflet-interactive.live-transit-flow {
          stroke-dasharray: 10, 12;
          animation: route-flow 1.2s linear infinite;
        }
        .leaflet-interactive.completed-transit-leg {
          stroke-dasharray: 4, 6;
          opacity: 0.55;
        }

        /* Leaflet popup styling */
        .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18) !important;
          padding: 0 !important;
          overflow: hidden;
          border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-popup-tip-container { margin-top: -1px; }

        /* Custom scrollbar for sidebar */
        .delivery-sidebar-scroll::-webkit-scrollbar { width: 5px; }
        .delivery-sidebar-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      {/* Top Header Row */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3 flex-shrink-0">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h5 className="mb-0 fw-bold text-dark">
              <i className="ri-road-map-line text-primary me-2" />Live Delivery Radar & Journey Map
            </h5>
            <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-1" style={{ fontSize: 11 }}>
              <i className="ri-radar-fill me-1 animate-pulse" />Realtime GPS Active
            </span>
          </div>
          <p className="text-muted small mb-0 mt-0.5">
            Tracking live driver dispatch, customer recipient destinations, and animated route journeys in Abia State
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Refresh speed picker */}
          <div className="input-group input-group-sm" style={{ width: 'auto' }}>
            <span className="input-group-text bg-white border-end-0 text-muted" style={{ fontSize: 11 }}>
              <i className="ri-timer-line me-1" />Interval
            </span>
            <select
              className="form-select form-select-sm bg-white border-start-0"
              style={{ fontSize: 11, fontWeight: 600, width: 85 }}
              value={refreshSec}
              onChange={(e) => setRefreshSec(Number(e.target.value))}>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={20}>20s</option>
              <option value={60}>1m</option>
            </select>
          </div>

          <button
            className={`btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1.5 ${isRefreshing ? 'disabled' : ''}`}
            onClick={() => load(true)}
            title="Refresh GPS positions right now">
            <i className={`ri-refresh-line ${isRefreshing ? 'ri-spin' : ''}`} />
            <span>{isRefreshing ? 'Updating...' : 'Sync GPS'}</span>
          </button>

          <Link to="/deliveries/active" className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1">
            <i className="ri-list-unordered me-0.5" />Deliveries List
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="row g-2 mb-3 flex-shrink-0">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 p-2.5 bg-card-glow-blue" style={{ borderLeft: '4px solid #2563eb' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-uppercase fw-bold text-muted" style={{ fontSize: 10 }}>En Route (In Transit)</div>
                <div className="fs-5 fw-bold text-primary">{enRouteCount}</div>
              </div>
              <div className="rounded-circle p-2" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}>
                <i className="ri-truck-line fs-5" />
              </div>
            </div>
            <div className="text-muted small mt-1" style={{ fontSize: 10 }}>
              <span className="text-success fw-bold">Live journey</span> lines displayed
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 p-2.5 bg-card-glow-cyan" style={{ borderLeft: '4px solid #0891b2' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-uppercase fw-bold text-muted" style={{ fontSize: 10 }}>Awaiting Pickup</div>
                <div className="fs-5 fw-bold text-info">{awaitingCount}</div>
              </div>
              <div className="rounded-circle p-2" style={{ background: 'rgba(8,145,178,0.12)', color: '#0891b2' }}>
                <i className="ri-store-2-line fs-5" />
              </div>
            </div>
            <div className="text-muted small mt-1" style={{ fontSize: 10 }}>
              At Aba / Umuahia depots
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 p-2.5 bg-card-glow-amber" style={{ borderLeft: '4px solid #ea580c' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-uppercase fw-bold text-muted" style={{ fontSize: 10 }}>Attempted / Issues</div>
                <div className="fs-5 fw-bold text-warning">{attemptedCount}</div>
              </div>
              <div className="rounded-circle p-2" style={{ background: 'rgba(234,88,12,0.12)', color: '#ea580c' }}>
                <i className="ri-alarm-warning-line fs-5" />
              </div>
            </div>
            <div className="text-muted small mt-1" style={{ fontSize: 10 }}>
              {attemptedCount > 0 ? 'Follow-up with recipient' : 'No delivery hitches'}
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm rounded-3 p-2.5 bg-card-glow-indigo" style={{ borderLeft: '4px solid #4f46e5' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-uppercase fw-bold text-muted" style={{ fontSize: 10 }}>Total Active</div>
                <div className="fs-5 fw-bold text-dark">{deliveries.length}</div>
              </div>
              <div className="rounded-circle p-2" style={{ background: 'rgba(79,70,229,0.12)', color: '#4f46e5' }}>
                <i className="ri-compass-3-line fs-5" />
              </div>
            </div>
            <div className="text-muted small mt-1" style={{ fontSize: 10 }}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Map & Interactive Side Panel Layout */}
      <div className="flex-grow-1 row g-0 border rounded-4 overflow-hidden shadow-sm bg-white" style={{ minHeight: 0, position: 'relative' }}>

        {/* ── Left Sidebar: Active Deliveries & Recipient Filter ──────────────── */}
        <div className="col-12 col-lg-4 col-xl-3.5 d-flex flex-column border-end bg-white" style={{ height: '100%', zIndex: 10 }}>
          
          {/* Search and Filters Bar */}
          <div className="p-2.5 border-bottom bg-light-subtle">
            <div className="input-group input-group-sm mb-2">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="ri-search-line" />
              </span>
              <input
                type="text"
                className="form-control form-control-sm bg-white border-start-0 ps-0"
                placeholder="Search recipient, driver, order #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="btn btn-sm btn-white border-start-0 text-muted" onClick={() => setSearchQuery('')}>
                  <i className="ri-close-line" />
                </button>
              )}
            </div>

            {/* Quick Filter Badges */}
            <div className="d-flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {[
                { key: 'all', label: 'All', count: deliveries.length },
                { key: 'en_route', label: 'En Route', count: enRouteCount },
                { key: 'awaiting', label: 'Awaiting', count: awaitingCount },
                { key: 'attempted', label: 'Attempted', count: attemptedCount },
              ].map(f => (
                <button
                  key={f.key}
                  className={`btn btn-xs rounded-pill px-2.5 py-1 text-nowrap fw-medium ${
                    statusFilter === f.key ? 'btn-primary shadow-xs' : 'btn-light text-secondary border'
                  }`}
                  style={{ fontSize: 11 }}
                  onClick={() => setStatusFilter(f.key)}>
                  {f.label} <span className="opacity-75 ms-0.5">({f.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Cards Scroll List */}
          <div className="flex-grow-1 overflow-y-auto delivery-sidebar-scroll p-2">
            {loading && (
              <div className="p-4 text-center text-muted small">
                <div className="spinner-border spinner-border-sm text-primary mb-2" role="status" />
                <div>Connecting to GPS telemetry...</div>
              </div>
            )}

            {!loading && filteredDeliveries.length === 0 && (
              <div className="p-4 text-center text-muted">
                <i className="ri-map-pin-user-line fs-1 text-secondary opacity-50 d-block mb-2" />
                <div className="fw-medium">No deliveries found</div>
                <div className="small">No active dispatch orders matching filter</div>
              </div>
            )}

            {filteredDeliveries.map(del => {
              const cfg = STATUS_CFG[del.status] || DEFAULT_STATUS_CFG
              const color = colorFor(del.driver_id)
              const isSel = selected?.id === del.id
              const hasGps = del.driver_lat != null && del.driver_lng != null
              const distKm = (del.driver_lat && del.customer_lat)
                ? calcDistanceKm(del.driver_lat, del.driver_lng, del.customer_lat, del.customer_lng)
                : null

              const itemsCount = del.items?.length || 0

              return (
                <div
                  key={del.id}
                  className={`card mb-2 border rounded-3 p-2.5 transition-all ${
                    isSel ? 'border-primary shadow-sm' : 'border-light-subtle'
                  }`}
                  style={{
                    cursor: 'pointer',
                    background: isSel ? 'rgba(37, 99, 235, 0.04)' : '#ffffff',
                    borderLeft: isSel ? `4px solid ${color}` : '4px solid transparent',
                    transition: 'all 0.18s ease',
                  }}
                  onClick={() => handleSelectDelivery(del)}>

                  {/* Header: Driver Info & Status Badge */}
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-2 min-w-0">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                        style={{ width: 28, height: 28, background: color, fontSize: 10 }}>
                        {(del.driver_name || 'D').split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0">
                        <div className="fw-bold text-dark small text-truncate" style={{ fontSize: 12 }}>
                          {del.driver_name || 'Unassigned Rider'}
                        </div>
                        <div className="text-muted" style={{ fontSize: 9.5 }}>
                          {del.driver_plate ? `${del.driver_plate}` : (del.vehicle_type || 'Motorcycle')}
                        </div>
                      </div>
                    </div>

                    <span
                      className="badge rounded-pill fw-medium flex-shrink-0 px-2 py-1"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 9.5 }}>
                      <i className={`${cfg.icon} me-1`} />{cfg.label}
                    </span>
                  </div>

                  {/* RECIPIENT / WHO HE IS DELIVERING TO */}
                  <div className="p-2 rounded-2 bg-light-subtle border mb-2">
                    <div className="d-flex align-items-start justify-content-between">
                      <div className="fw-semibold text-dark" style={{ fontSize: 11.5 }}>
                        <i className="ri-user-star-line text-primary me-1" />
                        {del.customer_name || 'Customer'}
                      </div>
                      {del.customer_phone && (
                        <a
                          href={`tel:${del.customer_phone}`}
                          className="badge bg-white text-success border text-decoration-none"
                          style={{ fontSize: 9 }}
                          onClick={(e) => e.stopPropagation()}
                          title="Call Customer">
                          <i className="ri-phone-fill me-0.5" />{del.customer_phone}
                        </a>
                      )}
                    </div>

                    <div className="text-muted text-truncate mt-1" style={{ fontSize: 10.5 }} title={del.delivery_address}>
                      <i className="ri-map-pin-2-fill text-danger me-1 flex-shrink-0" />
                      {del.delivery_address || 'Abia State'}
                    </div>
                  </div>

                  {/* Order summary & Items preview */}
                  <div className="d-flex align-items-center justify-content-between small text-muted pt-1 border-top" style={{ fontSize: 10.5 }}>
                    <div className="d-flex align-items-center gap-1.5">
                      <span className="fw-bold text-dark">{fmt(del.order_total)}</span>
                      <span className="text-muted">·</span>
                      <span className="badge bg-light text-secondary border" style={{ fontSize: 9.5 }}>
                        {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    {/* ETA & Distance */}
                    <div className="d-flex align-items-center gap-2">
                      {distKm != null && (
                        <span className="text-primary fw-medium font-monospace">
                          <i className="ri-navigation-line me-0.5" />{distKm} km
                        </span>
                      )}
                      {del.eta_minutes != null && (
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: 9.5 }}>
                          ~{del.eta_minutes}m ETA
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Bar */}
                  <div className="mt-2 d-flex gap-1.5">
                    <button
                      className={`btn btn-xs w-100 fw-medium d-inline-flex align-items-center justify-content-center gap-1 ${
                        isSel ? 'btn-primary' : 'btn-light border text-dark'
                      }`}
                      style={{ fontSize: 10.5, padding: '4px 8px' }}>
                      <i className="ri-focus-3-line" />
                      {isSel ? 'Viewing Journey Line' : 'Track Route'}
                    </button>
                    {del.customer_phone && (
                      <a
                        href={`https://wa.me/234${del.customer_phone.replace(/^0/, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-xs btn-outline-success d-inline-flex align-items-center justify-content-center px-2"
                        style={{ fontSize: 11 }}
                        onClick={(e) => e.stopPropagation()}
                        title="WhatsApp Recipient">
                        <i className="ri-whatsapp-line" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Map Legend Footer */}
          <div className="p-2.5 border-top bg-light-subtle" style={{ fontSize: 10.5 }}>
            <div className="fw-bold text-dark mb-1.5 d-flex align-items-center justify-content-between">
              <span>Map Legend & Route Flow</span>
              <span className="badge bg-white text-muted border font-monospace">Abia Network</span>
            </div>
            <div className="row g-1 text-muted">
              <div className="col-6 d-flex align-items-center gap-1.5">
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1e293b', display: 'inline-block' }} />
                <span>Bems Hub / Depot</span>
              </div>
              <div className="col-6 d-flex align-items-center gap-1.5">
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
                <span>Driver GPS (Pulsing)</span>
              </div>
              <div className="col-6 d-flex align-items-center gap-1.5">
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffffff', border: '2.5px solid #2563eb', display: 'inline-block' }} />
                <span>Recipient Pin</span>
              </div>
              <div className="col-6 d-flex align-items-center gap-1.5">
                <span style={{ width: 16, height: 3, background: '#2563eb', borderTop: '2px dashed #60a5fa', display: 'inline-block' }} />
                <span>Active Journey Line</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Interactive Leaflet Map & Live Journey HUD ─────────── */}
        <div className="col-12 col-lg-8 col-xl-8.5 position-relative" style={{ height: '100%' }}>

          <MapContainer
            center={DEFAULT_CENTER}
            zoom={12}
            style={{ width: '100%', height: '100%', zIndex: 1 }}
            zoomControl={true}>

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Map Camera Controller */}
            <MapCameraController target={flyTarget} bounds={fitBoundsTarget} />

            {/* Bems Farms Physical Hubs */}
            {HUBS.map(hub => (
              <Marker key={hub.id} position={hub.coords} icon={storeIcon(hub.city.toUpperCase(), hub.name, hub.type)}>
                <Popup>
                  <div style={{ padding: '12px 14px', minWidth: 230 }}>
                    <div className="d-flex align-items-center gap-1.5 text-primary fw-bold mb-1" style={{ fontSize: 13 }}>
                      <i className="ri-store-3-fill" /> {hub.name}
                    </div>
                    <div className="text-muted small">{hub.type === 'hq' ? 'Central Agricultural Depot & Processing' : 'Express Retail Dispatch Hub'}</div>
                    <div className="mt-2 pt-1 border-top small text-muted">
                      <i className="ri-map-pin-line me-1" />{hub.city}, Abia State
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Render Deliveries, Drivers, Customer Destinations & Animated Route Lines */}
            {deliveries.map(del => {
              const cfg = STATUS_CFG[del.status] || DEFAULT_STATUS_CFG
              const color = colorFor(del.driver_id)
              const isSelectedDelivery = selected?.id === del.id
              const hasDriverGps = del.driver_lat != null && del.driver_lng != null
              const hasCustomerGps = del.customer_lat != null && del.customer_lng != null

              if (!hasDriverGps) return null

              const driverPos = [del.driver_lat, del.driver_lng]
              const customerPos = hasCustomerGps ? [del.customer_lat, del.customer_lng] : null
              const closestHub = getClosestHub(del.driver_lat, del.driver_lng)

              // Generate route paths
              const hubToDriverRoute = interpolateRoute(closestHub.coords, driverPos, 0.04)
              const driverToCustomerRoute = customerPos ? interpolateRoute(driverPos, customerPos, 0.06) : []

              return (
                <Fragment key={del.id}>
                  {/* 1. Hub to Driver (Completed Journey Segment) */}
                  {isSelectedDelivery && (
                    <Polyline
                      positions={hubToDriverRoute}
                      pathOptions={{
                        color: '#64748b',
                        weight: 3,
                        dashArray: '4,6',
                        opacity: 0.6,
                        className: 'completed-transit-leg',
                      }}
                    />
                  )}

                  {/* 2. Driver to Customer Destination (Live Transit Flow Journey Line) */}
                  {customerPos && (
                    <>
                      {/* Ambient Glow Aura */}
                      <Polyline
                        positions={driverToCustomerRoute}
                        pathOptions={{
                          color: isSelectedDelivery ? color : '#3b82f6',
                          weight: isSelectedDelivery ? 8 : 4,
                          opacity: isSelectedDelivery ? 0.35 : 0.2,
                          lineCap: 'round',
                        }}
                      />
                      {/* Active Animated Journey Line */}
                      <Polyline
                        positions={driverToCustomerRoute}
                        pathOptions={{
                          color: isSelectedDelivery ? color : '#2563eb',
                          weight: isSelectedDelivery ? 4 : 2.5,
                          opacity: isSelectedDelivery ? 1 : 0.75,
                          className: 'live-transit-flow',
                        }}
                      />
                    </>
                  )}

                  {/* 3. Driver Live GPS Marker */}
                  <Marker
                    position={driverPos}
                    icon={driverIcon(del.driver_name, color, cfg.pulse || isSelectedDelivery, del.driver_heading || 0)}
                    eventHandlers={{
                      click: () => handleSelectDelivery(del),
                    }}>
                    <Popup>
                      <div style={{ minWidth: 260, fontFamily: 'inherit' }}>
                        {/* Driver Popup Header */}
                        <div style={{ background: color, padding: '12px 14px', color: '#fff' }}>
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="fw-bold" style={{ fontSize: 13.5 }}>
                              <i className="ri-riding-line me-1" />{del.driver_name}
                            </div>
                            <span className="badge bg-white text-dark fw-bold" style={{ fontSize: 9.5 }}>
                              {cfg.label}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
                            {del.driver_plate || 'No plate registered'} · {del.driver_phone || 'No phone'}
                          </div>
                        </div>

                        {/* Delivery & Recipient Details */}
                        <div style={{ padding: '12px 14px' }}>
                          <div className="d-flex align-items-center justify-content-between mb-1.5 pb-1 border-bottom">
                            <span className="badge bg-light text-dark border font-monospace">Order #{del.order_id}</span>
                            <span className="fw-bold text-success">{fmt(del.order_total)}</span>
                          </div>

                          <div className="mb-2">
                            <div className="fw-bold text-dark small">
                              <i className="ri-user-smile-fill text-primary me-1" />
                              Delivering to: <span className="text-primary">{del.customer_name}</span>
                            </div>
                            <div className="text-muted small mt-0.5" style={{ fontSize: 11 }}>
                              <i className="ri-map-pin-2-fill text-danger me-1" />
                              {del.delivery_address}
                            </div>
                          </div>

                          {/* Quick call buttons */}
                          <div className="d-flex gap-1.5 mt-2">
                            {del.driver_phone && (
                              <a href={`tel:${del.driver_phone}`} className="btn btn-xs btn-primary w-100" style={{ fontSize: 11 }}>
                                <i className="ri-phone-line me-1" />Call Driver
                              </a>
                            )}
                            {del.customer_phone && (
                              <a href={`tel:${del.customer_phone}`} className="btn btn-xs btn-outline-success w-100" style={{ fontSize: 11 }}>
                                <i className="ri-phone-fill me-1" />Call Customer
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* 4. Customer Destination Marker */}
                  {customerPos && (
                    <Marker
                      position={customerPos}
                      icon={customerIcon(color, del.customer_name)}
                      eventHandlers={{
                        click: () => handleSelectDelivery(del),
                      }}>
                      <Popup>
                        <div style={{ padding: '12px 14px', minWidth: 240 }}>
                          <div className="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                              style={{ width: 30, height: 30, background: color, fontSize: 11 }}>
                              {(del.customer_name || 'C').charAt(0)}
                            </div>
                            <div>
                              <div className="fw-bold small text-dark">{del.customer_name}</div>
                              <div className="text-muted" style={{ fontSize: 10 }}>Recipient Destination</div>
                            </div>
                          </div>

                          <div className="small mb-2">
                            <div className="text-muted" style={{ fontSize: 10 }}>Delivery Address:</div>
                            <div className="fw-medium text-dark">{del.delivery_address}</div>
                          </div>

                          <div className="p-2 rounded bg-light border mb-2 d-flex justify-content-between align-items-center" style={{ fontSize: 11 }}>
                            <span>Order Total:</span>
                            <span className="fw-bold text-success">{fmt(del.order_total)}</span>
                          </div>

                          {del.customer_phone && (
                            <a href={`tel:${del.customer_phone}`} className="btn btn-xs btn-success w-100" style={{ fontSize: 11 }}>
                              <i className="ri-phone-fill me-1" />Call {del.customer_name?.split(' ')[0]} ({del.customer_phone})
                            </a>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </Fragment>
              )
            })}
          </MapContainer>

          {/* ── Top-Right Map Telemetry Overlay ──────────────────────────────── */}
          <div
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              zIndex: 999,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(8px)',
              borderRadius: 10,
              padding: '7px 14px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
              fontSize: 11,
              border: '1px solid rgba(226,232,240,0.9)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#22c55e',
                display: 'inline-block',
                boxShadow: '0 0 8px #22c55e',
              }}
            />
            <span className="fw-semibold text-dark">Live GPS Feed</span>
            <span className="text-muted">·</span>
            <span className="text-muted font-monospace">{refreshSec}s loop</span>
          </div>

          {/* ── Bottom Floating "Who is he delivering to?" Live Journey Card ─── */}
          {selected && (() => {
            const color = colorFor(selected.driver_id)
            const cfg = STATUS_CFG[selected.status] || DEFAULT_STATUS_CFG
            const distKm = (selected.driver_lat && selected.customer_lat)
              ? calcDistanceKm(selected.driver_lat, selected.driver_lng, selected.customer_lat, selected.customer_lng)
              : null
            const items = selected.items || []

            return (
              <div
                style={{
                  position: 'absolute',
                  bottom: 20,
                  right: 20,
                  left: 20,
                  maxWidth: 520,
                  marginLeft: 'auto',
                  zIndex: 1000,
                  background: '#ffffff',
                  borderRadius: 14,
                  boxShadow: '0 12px 36px rgba(15,23,42,0.22)',
                  border: `2px solid ${color}`,
                  overflow: 'hidden',
                  animation: 'fadeInUp 0.25s ease-out',
                }}>

                {/* Card Header: In-Transit Status & Close */}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${color}, #1e293b)`,
                    padding: '10px 16px',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="rounded-circle bg-white text-dark d-flex align-items-center justify-content-center fw-bold"
                      style={{ width: 26, height: 26, fontSize: 11 }}>
                      <i className="ri-riding-line text-primary" />
                    </div>
                    <div>
                      <div className="fw-bold" style={{ fontSize: 13 }}>
                        {selected.driver_name} <span className="opacity-75 fw-normal">({selected.driver_plate || 'Dispatch Rider'})</span>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-white text-dark fw-bold" style={{ fontSize: 10 }}>
                      <i className={`${cfg.icon} me-1`} />{cfg.label}
                    </span>
                    <button
                      className="btn btn-sm btn-link text-white p-0"
                      style={{ fontSize: 18, lineHeight: 1 }}
                      onClick={handleClearSelection}
                      title="Close Journey HUD">
                      <i className="ri-close-circle-fill" />
                    </button>
                  </div>
                </div>

                {/* Card Body: WHO HE IS DELIVERING TO */}
                <div className="p-3">
                  {/* Prominent Recipient Highlight */}
                  <div className="p-2.5 rounded-3 bg-primary-subtle border border-primary-subtle mb-2.5">
                    <div className="d-flex align-items-start justify-content-between">
                      <div>
                        <div className="text-uppercase fw-bold text-primary" style={{ fontSize: 9.5, letterSpacing: 0.5 }}>
                          <i className="ri-user-location-fill me-1" />Currently Delivering To:
                        </div>
                        <div className="fs-6 fw-bold text-dark mt-0.5">
                          {selected.customer_name}
                        </div>
                      </div>
                      <span className="badge bg-white text-primary border border-primary-subtle fw-bold font-monospace" style={{ fontSize: 10 }}>
                        Order #{selected.order_id}
                      </span>
                    </div>

                    <div className="d-flex align-items-start gap-1.5 mt-1.5 text-secondary" style={{ fontSize: 11.5 }}>
                      <i className="ri-map-pin-2-fill text-danger flex-shrink-0 mt-0.5" />
                      <span className="fw-medium">{selected.delivery_address || 'Abia State Destination'}</span>
                    </div>

                    {selected.customer_phone && (
                      <div className="mt-1.5 d-flex align-items-center gap-2">
                        <a
                          href={`tel:${selected.customer_phone}`}
                          className="btn btn-xs btn-success d-inline-flex align-items-center gap-1 py-1 px-2.5"
                          style={{ fontSize: 11 }}>
                          <i className="ri-phone-fill" /> Call Recipient ({selected.customer_phone})
                        </a>
                        <a
                          href={`https://wa.me/234${selected.customer_phone.replace(/^0/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-xs btn-outline-success d-inline-flex align-items-center gap-1 py-1 px-2.5"
                          style={{ fontSize: 11 }}>
                          <i className="ri-whatsapp-line" /> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Route Journey Metrics Strip */}
                  <div className="row g-2 mb-2.5 text-center">
                    <div className="col-4">
                      <div className="p-1.5 rounded-2 bg-light border">
                        <div className="text-muted" style={{ fontSize: 9.5 }}>Distance Left</div>
                        <div className="fw-bold text-dark font-monospace" style={{ fontSize: 12 }}>
                          {distKm != null ? `${distKm} km` : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-1.5 rounded-2 bg-light border">
                        <div className="text-muted" style={{ fontSize: 9.5 }}>Estimated Arrival</div>
                        <div className="fw-bold text-primary" style={{ fontSize: 12 }}>
                          {selected.eta_minutes != null ? `~${selected.eta_minutes} mins` : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-1.5 rounded-2 bg-light border">
                        <div className="text-muted" style={{ fontSize: 9.5 }}>Order Value</div>
                        <div className="fw-bold text-success font-monospace" style={{ fontSize: 12 }}>
                          {fmt(selected.order_total)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Contents Summary */}
                  {items.length > 0 && (
                    <div className="mb-2">
                      <div className="text-muted fw-semibold mb-1" style={{ fontSize: 10 }}>
                        <i className="ri-shopping-basket-line me-1" />Produce in transit ({items.length} items):
                      </div>
                      <div className="d-flex flex-wrap gap-1">
                        {items.slice(0, 4).map((item, idx) => (
                          <span key={idx} className="badge bg-light text-dark border" style={{ fontSize: 10 }}>
                            {item.quantity || 1}x {item.name}
                          </span>
                        ))}
                        {items.length > 4 && (
                          <span className="badge bg-light text-secondary border" style={{ fontSize: 10 }}>
                            +{items.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="d-flex gap-2 pt-2 border-top">
                    {selected.driver_phone && (
                      <a href={`tel:${selected.driver_phone}`} className="btn btn-sm btn-outline-primary w-50" style={{ fontSize: 11.5 }}>
                        <i className="ri-phone-line me-1" />Call Driver ({selected.driver_name?.split(' ')[0]})
                      </a>
                    )}
                    <Link to={`/orders/details/${selected.order_id}`} className="btn btn-sm btn-light border w-50 text-dark" style={{ fontSize: 11.5 }}>
                      <i className="ri-file-list-3-line me-1" />Order Details
                    </Link>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
