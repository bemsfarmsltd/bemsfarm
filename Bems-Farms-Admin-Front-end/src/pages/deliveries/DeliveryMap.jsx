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
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -26],
    html: `
      <div class="driver-marker-container">
        ${pulseHtml}
        <div class="driver-marker-avatar" style="background:${color};">
          <i class="ri-riding-line" style="font-size:18px;"></i>
        </div>
        <div class="driver-marker-badge" style="background:${color};">
          ${(name || 'Driver').split(' ')[0]}
        </div>
      </div>`,
  })
}

function customerIcon(color, name) {
  const shortName = (name || 'Customer').split(' ')[0]
  return L.divIcon({
    className: 'custom-customer-marker-wrap',
    iconSize: [42, 52],
    iconAnchor: [21, 50],
    popupAnchor: [0, -52],
    html: `
      <div class="customer-marker-pin">
        <div class="customer-pin-body" style="border-color:${color};">
          <i class="ri-home-4-fill" style="color:${color};font-size:16px;"></i>
        </div>
        <div class="customer-pin-tip" style="border-top-color:${color};"></div>
        <div class="customer-pin-pill" style="background:${color};">
          <i class="ri-user-smile-line me-0.5"></i>${shortName}
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
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, duration: 1.2 })
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

      // Auto-select first active delivery if none selected
      setSelected(prev => {
        if (prev) {
          const updated = list.find(d => d.id === prev.id)
          return updated || prev
        }
        if (list.length > 0) {
          const defaultDel = list.find(d => d.status === 'en_route' || d.status === 'out_for_delivery') || list[0]
          if (defaultDel && defaultDel.driver_lat != null) {
            const custLat = defaultDel.customer_lat || Number(defaultDel.driver_lat) + 0.014
            const custLng = defaultDel.customer_lng || Number(defaultDel.driver_lng) - 0.016
            const hub = getClosestHub(defaultDel.driver_lat, defaultDel.driver_lng)
            setFitBoundsTarget([
              [defaultDel.driver_lat, defaultDel.driver_lng],
              [custLat, custLng],
              hub.coords,
            ])
          }
          return defaultDel
        }
        return null
      })
    } catch (err) {
      console.error('Failed to load active deliveries:', err)
      toast.error('Failed to load active deliveries')
    } finally {
      setLoading(false)
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 400)
        toast.success('Live GPS positions refreshed')
      }
    }
  }, [])

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
      const custLat = del.customer_lat || Number(del.driver_lat) + 0.014
      const custLng = del.customer_lng || Number(del.driver_lng) - 0.016
      const hub = getClosestHub(del.driver_lat, del.driver_lng)
      setFitBoundsTarget([
        [del.driver_lat, del.driver_lng],
        [custLat, custLng],
        hub.coords,
      ])
      setFlyTarget(null)
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
    <div className="container-fluid py-3" style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>

      {/* Embedded CSS for glowing realtime journey lines & radar pulses */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.85); opacity: 0.95; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes route-flow {
          from { stroke-dashoffset: 48; }
          to { stroke-dashoffset: 0; }
        }
        .driver-marker-container {
          position: relative;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .driver-live-pulse {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 3px solid var(--pulse-color, #2563eb);
          animation: pulse-ring 1.6s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        .driver-marker-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          border: 2.5px solid #ffffff;
          position: relative;
          z-index: 2;
        }
        .driver-marker-badge {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          color: #fff;
          font-size: 9.5px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 10px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.9);
          z-index: 3;
          letter-spacing: 0.3px;
        }

        /* Customer destination marker */
        .customer-marker-pin {
          position: relative;
          width: 42px;
          height: 52px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .customer-pin-body {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          z-index: 2;
        }
        .customer-pin-tip {
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 11px solid #2563eb;
          margin-top: -3px;
          z-index: 1;
        }
        .customer-pin-pill {
          position: absolute;
          top: -10px;
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          padding: 1.5px 7px;
          border-radius: 6px;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          z-index: 3;
          max-width: 95px;
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
          font-size: 7.5px;
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
          stroke-dasharray: 10, 14;
          animation: route-flow 1.2s linear infinite;
        }
        .leaflet-interactive.completed-transit-leg {
          stroke-dasharray: 5, 7;
          opacity: 0.6;
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
            <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2.5 py-1" style={{ fontSize: 11 }}>
              <i className="ri-radar-fill me-1" />Realtime GPS Active
            </span>
          </div>
          <p className="text-muted small mb-0 mt-0.5">
            Realtime route journey tracking from Bems Farms Hubs to customer delivery destinations
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Refresh speed picker */}
          <div className="input-group input-group-sm" style={{ width: 'auto' }}>
            <span className="input-group-text bg-white border-end-0 text-muted" style={{ fontSize: 11.5 }}>
              <i className="ri-timer-line me-1" />Interval
            </span>
            <select
              className="form-select form-select-sm bg-white border-start-0"
              style={{ fontSize: 11.5, fontWeight: 600, width: 85 }}
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

      {/* Spacious KPI Stat Cards */}
      <div className="row g-3 mb-3 flex-shrink-0">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm rounded-4 bg-white" style={{ borderLeft: '4px solid #2563eb' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="text-uppercase fw-bold text-muted" style={{ fontSize: 11, letterSpacing: 0.5 }}>
                  En Route (In Transit)
                </span>
                <span className="p-2 rounded-3" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>
                  <i className="ri-truck-line fs-5"></i>
                </span>
              </div>
              <div className="fs-3 fw-bolder text-primary mb-1">{enRouteCount}</div>
              <div className="d-flex align-items-center justify-content-between text-muted border-top pt-2 mt-2" style={{ fontSize: 11 }}>
                <span>Live Route Tracking</span>
                <strong className="text-success font-monospace">Active transit</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm rounded-4 bg-white" style={{ borderLeft: '4px solid #0891b2' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="text-uppercase fw-bold text-muted" style={{ fontSize: 11, letterSpacing: 0.5 }}>
                  Awaiting Pickup
                </span>
                <span className="p-2 rounded-3" style={{ background: 'rgba(8,145,178,0.1)', color: '#0891b2' }}>
                  <i className="ri-store-2-line fs-5"></i>
                </span>
              </div>
              <div className="fs-3 fw-bolder text-info mb-1">{awaitingCount}</div>
              <div className="d-flex align-items-center justify-content-between text-muted border-top pt-2 mt-2" style={{ fontSize: 11 }}>
                <span>Aba & Umuahia Hubs</span>
                <strong className="text-dark font-monospace">Ready for rider</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm rounded-4 bg-white" style={{ borderLeft: '4px solid #ea580c' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="text-uppercase fw-bold text-muted" style={{ fontSize: 11, letterSpacing: 0.5 }}>
                  Attempted / Issues
                </span>
                <span className="p-2 rounded-3" style={{ background: 'rgba(234,88,12,0.1)', color: '#ea580c' }}>
                  <i className="ri-alarm-warning-line fs-5"></i>
                </span>
              </div>
              <div className="fs-3 fw-bolder text-warning mb-1">{attemptedCount}</div>
              <div className="d-flex align-items-center justify-content-between text-muted border-top pt-2 mt-2" style={{ fontSize: 11 }}>
                <span>Customer Unavailable</span>
                <strong className="text-dark font-monospace">{attemptedCount > 0 ? 'Follow-up' : 'All clear'}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card h-100 border-0 shadow-sm rounded-4 bg-white" style={{ borderLeft: '4px solid #4f46e5' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="text-uppercase fw-bold text-muted" style={{ fontSize: 11, letterSpacing: 0.5 }}>
                  Total Active Deliveries
                </span>
                <span className="p-2 rounded-3" style={{ background: 'rgba(79,70,229,0.1)', color: '#4f46e5' }}>
                  <i className="ri-map-pin-line fs-5"></i>
                </span>
              </div>
              <div className="fs-3 fw-bolder text-dark mb-1">{deliveries.length}</div>
              <div className="d-flex align-items-center justify-content-between text-muted border-top pt-2 mt-2" style={{ fontSize: 11 }}>
                <span>Abia State Geofence</span>
                <strong className="text-dark font-monospace">{refreshSec}s auto-refresh</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map & Interactive Side Panel Layout */}
      <div className="flex-grow-1 row g-0 border rounded-4 overflow-hidden shadow-sm bg-white" style={{ minHeight: '620px', position: 'relative' }}>

        {/* ── Left Sidebar: Active Deliveries & Recipient Filter ──────────────── */}
        <div className="col-12 col-lg-4 col-xl-3.5 d-flex flex-column border-end bg-white" style={{ height: '100%', zIndex: 10 }}>
          
          {/* Search and Filters Bar */}
          <div className="p-3 border-bottom bg-light-subtle">
            <div className="input-group input-group-sm mb-2.5">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="ri-search-line" />
              </span>
              <input
                type="text"
                className="form-control form-control-sm bg-white border-start-0 ps-0"
                placeholder="Search recipient, driver, address..."
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
            <div className="d-flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
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
                  style={{ fontSize: 11.5 }}
                  onClick={() => setStatusFilter(f.key)}>
                  {f.label} <span className="opacity-75 ms-0.5">({f.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Cards Scroll List */}
          <div className="flex-grow-1 overflow-y-auto delivery-sidebar-scroll p-3">
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
              const customerLat = del.customer_lat || (del.driver_lat ? Number(del.driver_lat) + 0.014 : 5.122)
              const customerLng = del.customer_lng || (del.driver_lng ? Number(del.driver_lng) - 0.016 : 7.352)
              const distKm = (del.driver_lat && del.driver_lng)
                ? calcDistanceKm(del.driver_lat, del.driver_lng, customerLat, customerLng)
                : null

              const itemsCount = del.items?.length || 0

              return (
                <div
                  key={del.id}
                  className={`card mb-3 border rounded-3 p-3 transition-all ${
                    isSel ? 'border-primary shadow-md' : 'border-light-subtle shadow-xs'
                  }`}
                  style={{
                    cursor: 'pointer',
                    background: isSel ? 'rgba(37, 99, 235, 0.04)' : '#ffffff',
                    borderLeft: isSel ? `5px solid ${color}` : '4px solid transparent',
                    transition: 'all 0.18s ease',
                  }}
                  onClick={() => handleSelectDelivery(del)}>

                  {/* Header: Driver Info & Status Badge */}
                  <div className="d-flex align-items-center justify-content-between mb-2.5">
                    <div className="d-flex align-items-center gap-2 min-w-0">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                        style={{ width: 32, height: 32, background: color, fontSize: 11 }}>
                        <i className="ri-riding-line" />
                      </div>
                      <div className="min-w-0">
                        <div className="fw-bold text-dark small text-truncate" style={{ fontSize: 13 }}>
                          {del.driver_name || 'Unassigned Rider'}
                        </div>
                        <div className="text-muted" style={{ fontSize: 10.5 }}>
                          {del.driver_plate ? `${del.driver_plate}` : (del.vehicle_type || 'Motorcycle Dispatch')}
                        </div>
                      </div>
                    </div>

                    <span
                      className="badge rounded-pill fw-semibold flex-shrink-0 px-2.5 py-1"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 10 }}>
                      <i className={`${cfg.icon} me-1`} />{cfg.label}
                    </span>
                  </div>

                  {/* PROMINENT RECIPIENT CARD: WHO IS HE DELIVERING TO? */}
                  <div className="p-2.5 rounded-3 bg-light border mb-2.5">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="fw-bold text-dark" style={{ fontSize: 12.5 }}>
                        <i className="ri-user-star-fill text-primary me-1.5" />
                        {del.customer_name || 'Online Customer'}
                      </div>
                      <span className="badge bg-white text-muted border font-monospace" style={{ fontSize: 9.5 }}>
                        #{del.order_id}
                      </span>
                    </div>

                    <div className="text-secondary mt-1.5 d-flex align-items-start gap-1" style={{ fontSize: 11 }}>
                      <i className="ri-map-pin-2-fill text-danger flex-shrink-0 mt-0.5" />
                      <span>{del.delivery_address || 'Abia State Delivery Address'}</span>
                    </div>

                    {del.customer_phone && (
                      <div className="mt-2 pt-1.5 border-top d-flex align-items-center justify-content-between">
                        <span className="text-muted" style={{ fontSize: 10.5 }}>Recipient Contact:</span>
                        <a
                          href={`tel:${del.customer_phone}`}
                          className="badge bg-success-subtle text-success border border-success-subtle text-decoration-none py-1 px-2"
                          style={{ fontSize: 10.5 }}
                          onClick={(e) => e.stopPropagation()}
                          title="Call Recipient">
                          <i className="ri-phone-fill me-1" />{del.customer_phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Order summary & Telemetry info */}
                  <div className="d-flex align-items-center justify-content-between small text-muted pt-1 border-top" style={{ fontSize: 11 }}>
                    <div className="d-flex align-items-center gap-1.5">
                      <span className="fw-bold text-dark fs-6">{fmt(del.order_total)}</span>
                      <span className="text-muted">·</span>
                      <span className="badge bg-light text-secondary border" style={{ fontSize: 10 }}>
                        {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    {/* ETA & Distance */}
                    <div className="d-flex align-items-center gap-2">
                      {distKm != null && (
                        <span className="text-primary fw-semibold font-monospace">
                          <i className="ri-navigation-line me-0.5" />{distKm} km
                        </span>
                      )}
                      {del.eta_minutes != null && (
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold" style={{ fontSize: 10 }}>
                          ~{del.eta_minutes}m ETA
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="mt-2.5 d-flex gap-2">
                    <button
                      className={`btn btn-sm w-100 fw-semibold d-inline-flex align-items-center justify-content-center gap-1.5 ${
                        isSel ? 'btn-primary' : 'btn-light border text-dark'
                      }`}
                      style={{ fontSize: 11.5 }}>
                      <i className="ri-focus-3-line" />
                      {isSel ? 'Viewing Journey Line' : 'Track Live Journey'}
                    </button>
                    {del.customer_phone && (
                      <a
                        href={`https://wa.me/234${del.customer_phone.replace(/^0/, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-outline-success d-inline-flex align-items-center justify-content-center px-2.5"
                        style={{ fontSize: 13 }}
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
          <div className="p-3 border-top bg-light-subtle" style={{ fontSize: 11 }}>
            <div className="fw-bold text-dark mb-2 d-flex align-items-center justify-content-between">
              <span>Map Legend & Route Flow</span>
              <span className="badge bg-white text-muted border font-monospace">Abia Network</span>
            </div>
            <div className="row g-2 text-muted">
              <div className="col-6 d-flex align-items-center gap-2">
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#1e293b', display: 'inline-block' }} />
                <span>Bems Hub / Depot</span>
              </div>
              <div className="col-6 d-flex align-items-center gap-2">
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
                <span>Driver GPS (Pulsing)</span>
              </div>
              <div className="col-6 d-flex align-items-center gap-2">
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffffff', border: '2.5px solid #2563eb', display: 'inline-block' }} />
                <span>Recipient Pin</span>
              </div>
              <div className="col-6 d-flex align-items-center gap-2">
                <span style={{ width: 18, height: 3, background: '#2563eb', borderTop: '2px dashed #60a5fa', display: 'inline-block' }} />
                <span>Active Journey Line</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Interactive Leaflet Map & Live Journey HUD ─────────── */}
        <div className="col-12 col-lg-8 col-xl-8.5 position-relative" style={{ height: '100%', minHeight: '620px' }}>

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
                  <div style={{ padding: '14px 16px', minWidth: 240 }}>
                    <div className="d-flex align-items-center gap-1.5 text-primary fw-bold mb-1" style={{ fontSize: 13.5 }}>
                      <i className="ri-store-3-fill" /> {hub.name}
                    </div>
                    <div className="text-muted small">{hub.type === 'hq' ? 'Central Agricultural Depot & Processing' : 'Express Retail Dispatch Hub'}</div>
                    <div className="mt-2 pt-2 border-top small text-muted">
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

              if (!hasDriverGps) return null

              const driverPos = [del.driver_lat, del.driver_lng]
              const custLat = del.customer_lat || (del.driver_lat ? Number(del.driver_lat) + 0.014 : 5.122)
              const custLng = del.customer_lng || (del.driver_lng ? Number(del.driver_lng) - 0.016 : 7.352)
              const customerPos = [custLat, custLng]
              const closestHub = getClosestHub(del.driver_lat, del.driver_lng)

              // Generate route paths
              const hubToDriverRoute = interpolateRoute(closestHub.coords, driverPos, 0.04)
              const driverToCustomerRoute = interpolateRoute(driverPos, customerPos, 0.06)

              return (
                <Fragment key={del.id}>
                  {/* 1. Hub to Driver (Completed Journey Segment) */}
                  <Polyline
                    positions={hubToDriverRoute}
                    pathOptions={{
                      color: '#64748b',
                      weight: isSelectedDelivery ? 3.5 : 2,
                      dashArray: '5,7',
                      opacity: isSelectedDelivery ? 0.75 : 0.4,
                      className: 'completed-transit-leg',
                    }}
                  />

                  {/* 2. Driver to Customer Destination (Live Transit Flow Journey Line) */}
                  {/* Ambient Glow Aura */}
                  <Polyline
                    positions={driverToCustomerRoute}
                    pathOptions={{
                      color: isSelectedDelivery ? color : '#3b82f6',
                      weight: isSelectedDelivery ? 10 : 6,
                      opacity: isSelectedDelivery ? 0.35 : 0.2,
                      lineCap: 'round',
                    }}
                  />
                  {/* Active Animated Journey Line */}
                  <Polyline
                    positions={driverToCustomerRoute}
                    pathOptions={{
                      color: isSelectedDelivery ? color : '#2563eb',
                      weight: isSelectedDelivery ? 4.5 : 3,
                      opacity: isSelectedDelivery ? 1 : 0.8,
                      className: 'live-transit-flow',
                    }}
                  />

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
                            <div className="fw-bold" style={{ fontSize: 14 }}>
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
                          <div className="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom">
                            <span className="badge bg-light text-dark border font-monospace">Order #{del.order_id}</span>
                            <span className="fw-bold text-success fs-6">{fmt(del.order_total)}</span>
                          </div>

                          <div className="mb-2.5">
                            <div className="fw-bold text-dark small">
                              <i className="ri-user-star-fill text-primary me-1" />
                              Delivering to: <span className="text-primary">{del.customer_name}</span>
                            </div>
                            <div className="text-muted small mt-1" style={{ fontSize: 11 }}>
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
                  <Marker
                    position={customerPos}
                    icon={customerIcon(color, del.customer_name)}
                    eventHandlers={{
                      click: () => handleSelectDelivery(del),
                    }}>
                    <Popup>
                      <div style={{ padding: '14px 16px', minWidth: 250 }}>
                        <div className="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                            style={{ width: 32, height: 32, background: color, fontSize: 12 }}>
                            <i className="ri-user-star-fill" />
                          </div>
                          <div>
                            <div className="fw-bold text-dark" style={{ fontSize: 13 }}>{del.customer_name}</div>
                            <div className="text-muted" style={{ fontSize: 10.5 }}>Recipient Delivery Destination</div>
                          </div>
                        </div>

                        <div className="small mb-2">
                          <div className="text-muted" style={{ fontSize: 10.5 }}>Destination Address:</div>
                          <div className="fw-medium text-dark">{del.delivery_address}</div>
                        </div>

                        <div className="p-2 rounded-2 bg-light border mb-2.5 d-flex justify-content-between align-items-center" style={{ fontSize: 11.5 }}>
                          <span>Order Total:</span>
                          <span className="fw-bold text-success fs-6">{fmt(del.order_total)}</span>
                        </div>

                        {del.customer_phone && (
                          <a href={`tel:${del.customer_phone}`} className="btn btn-sm btn-success w-100" style={{ fontSize: 11.5 }}>
                            <i className="ri-phone-fill me-1" />Call {del.customer_name?.split(' ')[0]} ({del.customer_phone})
                          </a>
                        )}
                      </div>
                    </Popup>
                  </Marker>
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
              padding: '8px 16px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
              fontSize: 11.5,
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
            const custLat = selected.customer_lat || (selected.driver_lat ? Number(selected.driver_lat) + 0.014 : 5.122)
            const custLng = selected.customer_lng || (selected.driver_lng ? Number(selected.driver_lng) - 0.016 : 7.352)
            const distKm = (selected.driver_lat && selected.driver_lng)
              ? calcDistanceKm(selected.driver_lat, selected.driver_lng, custLat, custLng)
              : null
            const items = selected.items || []

            return (
              <div
                style={{
                  position: 'absolute',
                  bottom: 20,
                  right: 20,
                  left: 20,
                  maxWidth: 540,
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
                    padding: '12px 18px',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="rounded-circle bg-white text-dark d-flex align-items-center justify-content-center fw-bold"
                      style={{ width: 28, height: 28, fontSize: 12 }}>
                      <i className="ri-riding-line text-primary" />
                    </div>
                    <div>
                      <div className="fw-bold" style={{ fontSize: 13.5 }}>
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
                <div className="p-3.5">
                  {/* Prominent Recipient Highlight */}
                  <div className="p-3 rounded-3 bg-primary-subtle border border-primary-subtle mb-3">
                    <div className="d-flex align-items-start justify-content-between">
                      <div>
                        <div className="text-uppercase fw-bold text-primary" style={{ fontSize: 10, letterSpacing: 0.5 }}>
                          <i className="ri-user-star-fill me-1" />Currently Delivering To (Recipient):
                        </div>
                        <div className="fs-5 fw-bold text-dark mt-1">
                          {selected.customer_name}
                        </div>
                      </div>
                      <span className="badge bg-white text-primary border border-primary-subtle fw-bold font-monospace" style={{ fontSize: 10.5 }}>
                        Order #{selected.order_id}
                      </span>
                    </div>

                    <div className="d-flex align-items-start gap-1.5 mt-2 text-secondary" style={{ fontSize: 12 }}>
                      <i className="ri-map-pin-2-fill text-danger flex-shrink-0 mt-0.5" />
                      <span className="fw-semibold">{selected.delivery_address || 'Abia State Destination'}</span>
                    </div>

                    {selected.customer_phone && (
                      <div className="mt-2.5 d-flex align-items-center gap-2">
                        <a
                          href={`tel:${selected.customer_phone}`}
                          className="btn btn-sm btn-success d-inline-flex align-items-center gap-1.5 py-1 px-3"
                          style={{ fontSize: 11.5 }}>
                          <i className="ri-phone-fill" /> Call Recipient ({selected.customer_phone})
                        </a>
                        <a
                          href={`https://wa.me/234${selected.customer_phone.replace(/^0/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1.5 py-1 px-3"
                          style={{ fontSize: 11.5 }}>
                          <i className="ri-whatsapp-line" /> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Route Journey Metrics Strip */}
                  <div className="row g-2 mb-3 text-center">
                    <div className="col-4">
                      <div className="p-2 rounded-2 bg-light border">
                        <div className="text-muted" style={{ fontSize: 10 }}>Distance Left</div>
                        <div className="fw-bold text-dark font-monospace" style={{ fontSize: 13 }}>
                          {distKm != null ? `${distKm} km` : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2 rounded-2 bg-light border">
                        <div className="text-muted" style={{ fontSize: 10 }}>Estimated Arrival</div>
                        <div className="fw-bold text-primary" style={{ fontSize: 13 }}>
                          {selected.eta_minutes != null ? `~${selected.eta_minutes} mins` : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2 rounded-2 bg-light border">
                        <div className="text-muted" style={{ fontSize: 10 }}>Order Value</div>
                        <div className="fw-bold text-success font-monospace" style={{ fontSize: 13 }}>
                          {fmt(selected.order_total)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Contents Summary */}
                  {items.length > 0 && (
                    <div className="mb-2.5">
                      <div className="text-muted fw-semibold mb-1" style={{ fontSize: 10.5 }}>
                        <i className="ri-shopping-basket-line me-1" />Produce in transit ({items.length} items):
                      </div>
                      <div className="d-flex flex-wrap gap-1.5">
                        {items.slice(0, 4).map((item, idx) => (
                          <span key={idx} className="badge bg-light text-dark border p-1.5" style={{ fontSize: 10.5 }}>
                            {item.quantity || 1}x {item.name}
                          </span>
                        ))}
                        {items.length > 4 && (
                          <span className="badge bg-light text-secondary border p-1.5" style={{ fontSize: 10.5 }}>
                            +{items.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="d-flex gap-2 pt-2 border-top">
                    {selected.driver_phone && (
                      <a href={`tel:${selected.driver_phone}`} className="btn btn-sm btn-outline-primary w-50" style={{ fontSize: 12 }}>
                        <i className="ri-phone-line me-1" />Call Driver ({selected.driver_name?.split(' ')[0]})
                      </a>
                    )}
                    <Link to={`/orders/details/${selected.order_id}`} className="btn btn-sm btn-light border w-50 text-dark" style={{ fontSize: 12 }}>
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
