import { useState, useEffect, useCallback } from 'react'
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

// Bems Farms warehouse — dispatch origin (Lagos Island)
const STORE_POS = [6.4553, 3.3862]

const STATUS_CFG = {
  assigned:           { label: 'Awaiting Pickup',   color: '#06b6d4', bg: '#cffafe', pulse: false },
  awaiting_pickup:     { label: 'Awaiting Pickup',   color: '#06b6d4', bg: '#cffafe', pulse: false },
  en_route:            { label: 'En Route',          color: '#3b82f6', bg: '#dbeafe', pulse: true  },
  delivery_attempted:  { label: 'Attempted',         color: '#f97316', bg: '#ffedd5', pulse: false },
}
const DEFAULT_STATUS_CFG = { label: 'Active', color: '#6366f1', bg: '#e0e7ff', pulse: false }

const DRIVER_COLORS = ['#3b82f6', '#06b6d4', '#f97316', '#8b5cf6', '#22c55e', '#ec4899', '#f59e0b']
const colorFor = (id) => DRIVER_COLORS[Math.abs(Number(id) || 0) % DRIVER_COLORS.length]

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`

function driverIcon(name, color, pulse) {
  const initials = (name || '?').split(' ').map(n => n[0]).join('')
  const pulseHtml = pulse
    ? `<span style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${color};animation:pulse-ring 1.5s ease-out infinite;opacity:0.6;"></span>` : ''
  return L.divIcon({
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
    html: `
      <div style="position:relative;width:40px;height:40px;">
        ${pulseHtml}
        <div style="
          width:40px;height:40px;border-radius:50%;
          background:${color};color:#fff;
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          border:2px solid #fff;
          position:relative;z-index:1;
        ">${initials}</div>
        <div style="
          position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
          background:${color};color:#fff;font-size:9px;font-weight:600;
          padding:1px 5px;border-radius:4px;white-space:nowrap;
          box-shadow:0 1px 4px rgba(0,0,0,0.2);
        ">${(name || 'Driver').split(' ')[0]}</div>
      </div>`,
  })
}

function customerIcon(color) {
  return L.divIcon({
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -38],
    html: `
      <div style="position:relative;width:28px;height:36px;">
        <div style="
          width:28px;height:28px;border-radius:50%;
          background:#fff;border:3px solid ${color};
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
        "><i class="ri-home-4-fill" style="color:${color};font-size:13px;"></i></div>
        <div style="
          width:0;height:0;
          border-left:6px solid transparent;border-right:6px solid transparent;
          border-top:10px solid ${color};
          margin:0 auto;margin-top:-2px;
        "></div>
      </div>`,
  })
}

function storeIcon() {
  return L.divIcon({
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
    html: `
      <div style="
        width:44px;height:44px;border-radius:10px;
        background:#1e293b;color:#fff;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 3px 10px rgba(0,0,0,0.4);
        border:2px solid #fff;
        flex-direction:column;gap:1px;
      ">
        <i class="ri-store-2-fill" style="font-size:18px;"></i>
        <div style="font-size:7px;font-weight:700;letter-spacing:0.5px;">BEMS</div>
      </div>`,
  })
}

function FlyToDriver({ pos }) {
  const map = useMap()
  useEffect(() => {
    if (pos) map.flyTo(pos, 15, { duration: 1.2 })
  }, [pos, map])
  return null
}

export default function DeliveryMap() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected]   = useState(null)
  const [flyTarget, setFlyTarget] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/deliveries/active')
      setDeliveries(res.data.deliveries || [])
    } catch {
      toast.error('Failed to load active deliveries')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 20000)
    return () => clearInterval(id)
  }, [load])

  const withGps = deliveries.filter(d => d.driver_lat != null && d.driver_lng != null)

  const handleSelect = (del) => {
    setSelected(del)
    if (del.driver_lat != null && del.driver_lng != null) setFlyTarget([del.driver_lat, del.driver_lng])
  }

  return (
    <div className="container-fluid" style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>

      {/* Page Header */}
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row flex-shrink-0">
        <div className="flex-grow-1">
          <h6 className="mb-0">Live Delivery Map</h6>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge rounded-pill bg-success" style={{ fontSize: 11 }}>
            <i className="ri-checkbox-blank-circle-fill me-1" style={{ fontSize: 8 }} />Live
          </span>
          <span className="text-muted small">{deliveries.length} active deliveries</span>
        </div>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><Link to="/deliveries/active">Deliveries</Link></li>
          <li className="breadcrumb-item active">Live Map</li>
        </ul>
      </div>

      {/* Stat strip */}
      <div className="row g-2 mb-3 flex-shrink-0">
        {[
          { label: 'En Route',        count: deliveries.filter(d => STATUS_CFG[d.status]?.label === 'En Route').length,            color: '#3b82f6', icon: 'ri-truck-line'         },
          { label: 'Awaiting Pickup', count: deliveries.filter(d => STATUS_CFG[d.status]?.label === 'Awaiting Pickup').length,      color: '#06b6d4', icon: 'ri-user-location-line' },
          { label: 'Attempted',       count: deliveries.filter(d => d.status === 'delivery_attempted').length,                      color: '#f97316', icon: 'ri-route-line'          },
          { label: 'Total Active',    count: deliveries.length,                                                                     color: '#6366f1', icon: 'ri-map-pin-line'        },
        ].map(s => (
          <div key={s.label} className="col-6 col-md-3">
            <div className="card p-2 d-flex flex-row align-items-center gap-2" style={{ borderLeft: `3px solid ${s.color}` }}>
              <div className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 32, height: 32, background: s.color + '20' }}>
                <i className={`${s.icon}`} style={{ color: s.color, fontSize: 14 }} />
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: 10 }}>{s.label}</div>
                <div className="fw-bold fs-16">{s.count}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Map + Side Panel */}
      <div className="flex-grow-1 row g-0 overflow-hidden" style={{ minHeight: 0, borderRadius: 12, overflow: 'hidden' }}>

        {/* Side panel */}
        <div className="col-12 col-lg-3" style={{ overflowY: 'auto', background: '#fff', borderRight: '1px solid #e5e7eb' }}>
          <div className="p-3 border-bottom d-flex align-items-center gap-2">
            <i className="ri-list-check text-muted" />
            <span className="fw-medium small">Active Deliveries</span>
            <span className="badge rounded-pill bg-primary ms-auto">{deliveries.length}</span>
          </div>

          {loading && <div className="p-4 text-center text-muted small">Loading…</div>}
          {!loading && deliveries.length === 0 && (
            <div className="p-4 text-center text-muted small">
              <i className="ri-truck-line fs-2 d-block mb-2" />No active deliveries right now.
            </div>
          )}

          {deliveries.map(del => {
            const cfg      = STATUS_CFG[del.status] || DEFAULT_STATUS_CFG
            const color    = colorFor(del.driver_id)
            const isActive = selected?.id === del.id
            const hasGps   = del.driver_lat != null && del.driver_lng != null
            return (
              <div key={del.id}
                className="p-3 border-bottom"
                style={{
                  cursor: hasGps ? 'pointer' : 'default',
                  background: isActive ? color + '12' : '#fff',
                  borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
                onClick={() => hasGps && handleSelect(del)}>

                {/* Top row */}
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 32, height: 32, background: color + '20', color, fontSize: 11, fontWeight: 700 }}>
                    {(del.driver_name || '?').split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-medium small text-truncate">{del.driver_name || 'Unassigned'}</div>
                    <div className="text-muted" style={{ fontSize: 10 }}>{del.driver_plate || '—'}</div>
                  </div>
                  <span className="badge flex-shrink-0" style={{ background: cfg.bg, color: cfg.color, fontSize: 9 }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Customer */}
                <div className="d-flex align-items-start gap-1 mb-1">
                  <i className="ri-user-line text-muted mt-1 flex-shrink-0" style={{ fontSize: 11 }} />
                  <div style={{ fontSize: 12 }}>{del.customer_name}</div>
                </div>
                <div className="d-flex align-items-start gap-1 mb-2">
                  <i className="ri-map-pin-line text-muted mt-1 flex-shrink-0" style={{ fontSize: 11 }} />
                  <div className="text-muted" style={{ fontSize: 11 }}>{del.delivery_address || '—'}</div>
                </div>

                {/* Footer */}
                <div className="d-flex align-items-center gap-2">
                  <span className="small fw-medium">{fmt(del.order_total)}</span>
                  {del.eta_minutes != null && (
                    <span className="text-muted small ms-auto">
                      <i className="ri-time-line me-1" />~{del.eta_minutes} min
                    </span>
                  )}
                  {del.attempts > 0 && (
                    <span className="badge ms-auto" style={{ background: '#ffedd5', color: '#f97316', fontSize: 9 }}>
                      Attempt {del.attempts}/2
                    </span>
                  )}
                </div>

                {hasGps ? (
                  <button className="btn btn-sm w-100 mt-2"
                    style={{ background: color + '15', color, border: `1px solid ${color}40`, fontSize: 11 }}>
                    <i className="ri-focus-3-line me-1" />Focus on Map
                  </button>
                ) : (
                  <div className="text-muted mt-2 text-center" style={{ fontSize: 10 }}>
                    <i className="ri-map-pin-off-line me-1" />No live GPS signal yet
                  </div>
                )}
              </div>
            )
          })}

          {/* Legend */}
          <div className="p-3 border-top" style={{ background: '#f8fafc' }}>
            <div className="fw-medium small mb-2 text-muted">Map Legend</div>
            <div className="d-flex flex-column gap-1">
              <div className="d-flex align-items-center gap-2" style={{ fontSize: 11 }}>
                <div className="rounded-circle flex-shrink-0" style={{ width: 12, height: 12, background: '#1e293b' }} />
                Bems Farms Warehouse
              </div>
              <div className="d-flex align-items-center gap-2" style={{ fontSize: 11 }}>
                <div className="rounded-circle flex-shrink-0" style={{ width: 12, height: 12, background: '#3b82f6' }} />
                Driver (En Route) — pulsing
              </div>
              <div className="d-flex align-items-center gap-2" style={{ fontSize: 11 }}>
                <div className="rounded-circle flex-shrink-0" style={{ width: 12, height: 12, background: '#06b6d4' }} />
                Driver (Awaiting Pickup)
              </div>
              <div className="d-flex align-items-center gap-2" style={{ fontSize: 11 }}>
                <div className="rounded-circle flex-shrink-0" style={{ width: 12, height: 12, background: '#fff', border: '2px solid #888' }} />
                Customer Delivery Point
              </div>
              <div className="d-flex align-items-center gap-2" style={{ fontSize: 11 }}>
                <div className="flex-shrink-0" style={{ width: 24, height: 2, background: '#aaa', border: '1px dashed #888' }} />
                Delivery Route
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="col-12 col-lg-9" style={{ position: 'relative' }}>

          {/* Pulse CSS */}
          <style>{`
            @keyframes pulse-ring {
              0%   { transform: scale(0.8); opacity: 0.8; }
              100% { transform: scale(1.8); opacity: 0; }
            }
            .leaflet-popup-content-wrapper {
              border-radius: 10px !important;
              box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
              padding: 0 !important;
              overflow: hidden;
            }
            .leaflet-popup-content { margin: 0 !important; }
            .leaflet-popup-tip-container { margin-top: -1px; }
          `}</style>

          <MapContainer
            center={STORE_POS}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}>

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {flyTarget && <FlyToDriver pos={flyTarget} />}

            <Marker position={STORE_POS} icon={storeIcon()}>
              <Popup>
                <div style={{ padding: '12px 14px', minWidth: 200 }}>
                  <div className="fw-bold mb-1" style={{ fontSize: 13 }}>🏪 Bems Farms Warehouse</div>
                  <div className="text-muted small">Dispatch origin · All active deliveries depart here</div>
                  <div className="mt-2 small"><i className="ri-map-pin-line me-1" />Lagos Island, Lagos</div>
                </div>
              </Popup>
            </Marker>

            {withGps.map(del => {
              const cfg = STATUS_CFG[del.status] || DEFAULT_STATUS_CFG
              const color = colorFor(del.driver_id)
              const driverPos = [del.driver_lat, del.driver_lng]
              const hasCustomerPos = del.customer_lat != null && del.customer_lng != null
              const customerPos = hasCustomerPos ? [del.customer_lat, del.customer_lng] : null
              return (
                <div key={del.id}>
                  {customerPos && (
                    <Polyline
                      positions={[driverPos, customerPos]}
                      pathOptions={{ color, weight: 2.5, dashArray: cfg.pulse ? '' : '6,6', opacity: 0.7 }}
                    />
                  )}

                  <Marker position={driverPos} icon={driverIcon(del.driver_name, color, cfg.pulse)}>
                    <Popup>
                      <div style={{ minWidth: 240, fontFamily: 'inherit' }}>
                        <div style={{ background: color, padding: '10px 14px', color: '#fff' }}>
                          <div className="fw-bold" style={{ fontSize: 13 }}>{del.driver_name}</div>
                          <div style={{ fontSize: 11, opacity: 0.85 }}>{del.driver_plate || '—'} · {del.driver_phone || '—'}</div>
                          <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.25)', borderRadius: 4, padding: '2px 6px', display:'inline-block', marginTop: 4 }}>
                            {cfg.label}
                          </span>
                        </div>
                        <div style={{ padding: '10px 14px' }}>
                          <div className="small fw-medium mb-1">Order #{del.order_id}</div>
                          <div className="d-flex align-items-center gap-1 mb-1">
                            <i className="ri-user-line text-muted" style={{ fontSize: 11 }} />
                            <span style={{ fontSize: 12 }}>{del.customer_name}</span>
                          </div>
                          <div className="d-flex align-items-start gap-1 mb-2">
                            <i className="ri-map-pin-line text-muted mt-1 flex-shrink-0" style={{ fontSize: 11 }} />
                            <span className="text-muted" style={{ fontSize: 11 }}>{del.delivery_address || '—'}</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-bold small">{fmt(del.order_total)}</span>
                            {del.eta_minutes != null && <span className="small text-muted"><i className="ri-time-line me-1"/>~{del.eta_minutes} min</span>}
                            {del.attempts > 0 && <span className="badge" style={{ background: '#ffedd5', color: '#f97316', fontSize: 9 }}>Attempt {del.attempts}/2</span>}
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {customerPos && (
                    <Marker position={customerPos} icon={customerIcon(color)}>
                      <Popup>
                        <div style={{ padding: '12px 14px', minWidth: 200 }}>
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <div className="rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: 28, height: 28, background: color + '20', color, fontSize: 10, fontWeight: 700 }}>
                              {(del.customer_name || '?').split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="fw-medium small">{del.customer_name}</div>
                              <div className="text-muted" style={{ fontSize: 10 }}>{del.customer_phone || '—'}</div>
                            </div>
                          </div>
                          <div className="d-flex align-items-start gap-1 mb-1">
                            <i className="ri-map-pin-fill flex-shrink-0 mt-1" style={{ color, fontSize: 11 }} />
                            <span className="small">{del.delivery_address || '—'}</span>
                          </div>
                          <div className="border-top pt-2 mt-2 d-flex justify-content-between">
                            <span className="small text-muted">Order #{del.order_id}</span>
                            <span className="small fw-bold">{fmt(del.order_total)}</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </div>
              )
            })}
          </MapContainer>

          {/* Floating info overlay — selected delivery */}
          {selected && (() => {
            const color = colorFor(selected.driver_id)
            const cfg = STATUS_CFG[selected.status] || DEFAULT_STATUS_CFG
            return (
              <div style={{
                position: 'absolute', bottom: 20, right: 16, zIndex: 1000,
                background: '#fff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                padding: '12px 16px', maxWidth: 280, borderLeft: `4px solid ${color}`,
              }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 30, height: 30, background: color, color: '#fff', fontSize: 10, fontWeight: 700 }}>
                    {(selected.driver_name || '?').split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-medium small">{selected.driver_name}</div>
                    <div className="text-muted" style={{ fontSize: 10 }}>{cfg.label}</div>
                  </div>
                  <button className="btn btn-sm btn-outline-secondary p-1" style={{ lineHeight: 1 }}
                    onClick={() => { setSelected(null); setFlyTarget(null) }}>
                    <i className="ri-close-line" style={{ fontSize: 12 }} />
                  </button>
                </div>
                <div style={{ fontSize: 12 }}>
                  <div><strong>Order:</strong> #{selected.order_id}</div>
                  <div><strong>Customer:</strong> {selected.customer_name}</div>
                  <div className="text-muted">{selected.delivery_address}</div>
                  {selected.eta_minutes != null && <div className="mt-1 text-primary"><i className="ri-time-line me-1" />~{selected.eta_minutes} min remaining</div>}
                </div>
                {selected.driver_phone && (
                  <a href={`tel:${selected.driver_phone}`} className="btn btn-sm btn-success w-100 mt-2" style={{ fontSize: 11 }}>
                    <i className="ri-phone-line me-1" />Call {selected.driver_name?.split(' ')[0]}
                  </a>
                )}
              </div>
            )
          })()}

          {/* GPS update indicator */}
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 999,
            background: 'rgba(255,255,255,0.95)', borderRadius: 8,
            padding: '6px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block',
              animation: 'pulse-ring 1.5s ease-out infinite' }} />
            GPS positions refresh every 20s
          </div>
        </div>
      </div>
    </div>
  )
}
