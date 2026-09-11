import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ─── Fix Leaflet default marker icons in Vite ─────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─── Lagos coordinates ─────────────────────────────────────────────────────────
const STORE_POS   = [6.4553, 3.3862]  // Bems Farms warehouse (Lagos Island)

// ─── Delivery mock data with GPS positions ────────────────────────────────────
const DELIVERIES = [
  {
    id: 'DEL-2026-0042', orderId: 'ORD-2026-0138', status: 'shipped',
    driver: { name: 'Emeka Okafor', phone: '08045678901', bike: 'LAG-567-CD', color: '#3b82f6' },
    customer: { name: 'Kemi Balogun', phone: '08167891234', address: '18 Surulere, Lagos' },
    driverPos:   [6.4920, 3.3600],   // en route — halfway between store & customer
    customerPos: [6.5048, 3.3543],   // Surulere
    zone: 'Surulere / Yaba',
    eta: '~18 min', total: 16100, attempts: 0,
    items: 'Fresh Tomatoes ×3kg, Red Bell Pepper ×2kg',
  },
  {
    id: 'DEL-2026-0041', orderId: 'ORD-2026-0139', status: 'assigned',
    driver: { name: 'Tunde Adeyemi', phone: '08031234567', bike: 'LAG-234-AB', color: '#06b6d4' },
    customer: { name: 'Seun Adesanya', phone: '09012341234', address: '5 Ikeja GRA, Lagos' },
    driverPos:   [6.4553, 3.3862],   // still at store — awaiting pickup
    customerPos: [6.5944, 3.3478],   // Ikeja GRA
    zone: 'Ikeja / GRA',
    eta: '—', total: 14200, attempts: 0,
    items: 'Ginger ×1kg, Garlic ×1kg, Sweet Corn ×6 cobs',
  },
  {
    id: 'DEL-2026-0040', orderId: 'ORD-2026-0137', status: 'delivery_attempted',
    driver: { name: 'Bola Akinwale', phone: '08056789012', bike: 'LAG-890-EF', color: '#f97316' },
    customer: { name: 'Tobi Adekunle', phone: '07056781234', address: '3 Ojota Estate, Lagos' },
    driverPos:   [6.5730, 3.3930],   // near customer — attempted
    customerPos: [6.5810, 3.3950],   // Ojota
    zone: 'Maryland / Gbagada',
    eta: '—', total: 12400, attempts: 1,
    items: 'Plantain ×4 hands, Ugwu ×3 bunches',
  },
  {
    id: 'DEL-2026-0039', orderId: 'ORD-2026-0141', status: 'assigned',
    driver: { name: 'Femi Adeleye', phone: '08078901234', bike: 'LAG-456-IJ', color: '#8b5cf6' },
    customer: { name: 'Adaeze Nwosu', phone: '07098765432', address: '7 Lekki Phase 1, Lagos' },
    driverPos:   [6.4553, 3.3862],   // still at store — awaiting pickup
    customerPos: [6.4677, 3.5215],   // Lekki Phase 1
    zone: 'Lekki Phase 1',
    eta: '—', total: 48100, attempts: 0,
    items: 'Fresh Tomatoes ×8kg, Red Bell Pepper ×4kg +2 more',
  },
]

const STATUS_CFG = {
  assigned:           { label: 'Awaiting Pickup', color: '#06b6d4', bg: '#cffafe', pulse: false },
  shipped:            { label: 'En Route',        color: '#3b82f6', bg: '#dbeafe', pulse: true  },
  delivery_attempted: { label: 'Attempted',       color: '#f97316', bg: '#ffedd5', pulse: false },
}

const fmt = (n) => `₦${Number(n).toLocaleString()}`

// ─── Custom div icons ──────────────────────────────────────────────────────────
function driverIcon(driver, status) {
  const cfg     = STATUS_CFG[status]
  const initials = driver.name.split(' ').map(n => n[0]).join('')
  const pulse    = cfg.pulse
    ? `<span style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${driver.color};animation:pulse-ring 1.5s ease-out infinite;opacity:0.6;"></span>` : ''
  return L.divIcon({
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
    html: `
      <div style="position:relative;width:40px;height:40px;">
        ${pulse}
        <div style="
          width:40px;height:40px;border-radius:50%;
          background:${driver.color};color:#fff;
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          border:2px solid #fff;
          position:relative;z-index:1;
        ">${initials}</div>
        <div style="
          position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);
          background:${driver.color};color:#fff;font-size:9px;font-weight:600;
          padding:1px 5px;border-radius:4px;white-space:nowrap;
          box-shadow:0 1px 4px rgba(0,0,0,0.2);
        ">${driver.name.split(' ')[0]}</div>
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

// ─── FlyTo helper ─────────────────────────────────────────────────────────────
function FlyToDriver({ pos }) {
  const map = useMap()
  useEffect(() => {
    if (pos) map.flyTo(pos, 15, { duration: 1.2 })
  }, [pos, map])
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DeliveryMap() {
  const [selected, setSelected]   = useState(null)
  const [flyTarget, setFlyTarget] = useState(null)
  const [tick, setTick]           = useState(0) // simulate movement

  // Simulate driver positions updating every 8s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 8000)
    return () => clearInterval(id)
  }, [])

  // Slightly move "en route" driver positions each tick to simulate GPS updates
  const deliveries = DELIVERIES.map(d => {
    if (d.status !== 'shipped') return d
    const jitter = tick * 0.0003
    return {
      ...d,
      driverPos: [d.driverPos[0] + jitter, d.driverPos[1] + jitter * 0.5],
    }
  })

  const handleSelect = (del) => {
    setSelected(del)
    setFlyTarget(del.driverPos)
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
          <li className="breadcrumb-item"><a href="#">Deliveries</a></li>
          <li className="breadcrumb-item active">Live Map</li>
        </ul>
      </div>

      {/* Stat strip */}
      <div className="row g-2 mb-3 flex-shrink-0">
        {[
          { label: 'En Route',        count: deliveries.filter(d => d.status === 'shipped').length,            color: '#3b82f6', icon: 'ri-truck-line'         },
          { label: 'Awaiting Pickup', count: deliveries.filter(d => d.status === 'assigned').length,           color: '#06b6d4', icon: 'ri-user-location-line' },
          { label: 'Attempted',       count: deliveries.filter(d => d.status === 'delivery_attempted').length, color: '#f97316', icon: 'ri-route-line'          },
          { label: 'Total Active',    count: deliveries.length,                                                 color: '#6366f1', icon: 'ri-map-pin-line'        },
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

          {deliveries.map(del => {
            const cfg      = STATUS_CFG[del.status]
            const isActive = selected?.id === del.id
            return (
              <div key={del.id}
                className="p-3 border-bottom"
                style={{
                  cursor: 'pointer',
                  background: isActive ? del.driver.color + '12' : '#fff',
                  borderLeft: isActive ? `3px solid ${del.driver.color}` : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
                onClick={() => handleSelect(del)}>

                {/* Top row */}
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 32, height: 32, background: del.driver.color + '20', color: del.driver.color, fontSize: 11, fontWeight: 700 }}>
                    {del.driver.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-medium small text-truncate">{del.driver.name}</div>
                    <div className="text-muted" style={{ fontSize: 10 }}>{del.driver.bike}</div>
                  </div>
                  <span className="badge flex-shrink-0" style={{ background: cfg.bg, color: cfg.color, fontSize: 9 }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Customer */}
                <div className="d-flex align-items-start gap-1 mb-1">
                  <i className="ri-user-line text-muted mt-1 flex-shrink-0" style={{ fontSize: 11 }} />
                  <div style={{ fontSize: 12 }}>{del.customer.name}</div>
                </div>
                <div className="d-flex align-items-start gap-1 mb-2">
                  <i className="ri-map-pin-line text-muted mt-1 flex-shrink-0" style={{ fontSize: 11 }} />
                  <div className="text-muted" style={{ fontSize: 11 }}>{del.customer.address}</div>
                </div>

                {/* Footer */}
                <div className="d-flex align-items-center gap-2">
                  <span className="small fw-medium">{fmt(del.total)}</span>
                  {del.eta !== '—' && (
                    <span className="text-muted small ms-auto">
                      <i className="ri-time-line me-1" />{del.eta}
                    </span>
                  )}
                  {del.attempts > 0 && (
                    <span className="badge ms-auto" style={{ background: '#ffedd5', color: '#f97316', fontSize: 9 }}>
                      Attempt {del.attempts}/2
                    </span>
                  )}
                </div>

                <button className="btn btn-sm w-100 mt-2"
                  style={{ background: del.driver.color + '15', color: del.driver.color, border: `1px solid ${del.driver.color}40`, fontSize: 11 }}>
                  <i className="ri-focus-3-line me-1" />Focus on Map
                </button>
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
                <div className="rounded-circle flex-shrink-0" style={{ width: 12, height: 12, background: '#f97316' }} />
                Driver (Delivery Attempted)
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
            center={[6.5244, 3.3792]}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}>

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* FlyTo when user clicks a delivery */}
            {flyTarget && <FlyToDriver pos={flyTarget} />}

            {/* Bems Farms Store marker */}
            <Marker position={STORE_POS} icon={storeIcon()}>
              <Popup>
                <div style={{ padding: '12px 14px', minWidth: 200 }}>
                  <div className="fw-bold mb-1" style={{ fontSize: 13 }}>🏪 Bems Farms Warehouse</div>
                  <div className="text-muted small">Dispatch origin · All active deliveries depart here</div>
                  <div className="mt-2 small"><i className="ri-map-pin-line me-1" />Lagos Island, Lagos</div>
                </div>
              </Popup>
            </Marker>

            {deliveries.map(del => {
              const cfg = STATUS_CFG[del.status]
              return (
                <div key={del.id}>
                  {/* Dashed route line */}
                  <Polyline
                    positions={[del.driverPos, del.customerPos]}
                    pathOptions={{
                      color: del.driver.color,
                      weight: 2.5,
                      dashArray: del.status === 'shipped' ? '' : '6,6',
                      opacity: 0.7,
                    }}
                  />

                  {/* Driver marker */}
                  <Marker
                    position={del.driverPos}
                    icon={driverIcon(del.driver, del.status)}>
                    <Popup>
                      <div style={{ minWidth: 240, fontFamily: 'inherit' }}>
                        {/* Header */}
                        <div style={{ background: del.driver.color, padding: '10px 14px', color: '#fff' }}>
                          <div className="fw-bold" style={{ fontSize: 13 }}>{del.driver.name}</div>
                          <div style={{ fontSize: 11, opacity: 0.85 }}>{del.driver.bike} · {del.driver.phone}</div>
                          <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.25)', borderRadius: 4, padding: '2px 6px', display:'inline-block', marginTop: 4 }}>
                            {cfg.label}
                          </span>
                        </div>
                        {/* Body */}
                        <div style={{ padding: '10px 14px' }}>
                          <div className="small fw-medium mb-1">{del.orderId}</div>
                          <div className="d-flex align-items-center gap-1 mb-1">
                            <i className="ri-user-line text-muted" style={{ fontSize: 11 }} />
                            <span style={{ fontSize: 12 }}>{del.customer.name}</span>
                          </div>
                          <div className="d-flex align-items-start gap-1 mb-2">
                            <i className="ri-map-pin-line text-muted mt-1 flex-shrink-0" style={{ fontSize: 11 }} />
                            <span className="text-muted" style={{ fontSize: 11 }}>{del.customer.address}</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-bold small">{fmt(del.total)}</span>
                            {del.eta !== '—' && <span className="small text-muted"><i className="ri-time-line me-1"/>{del.eta}</span>}
                            {del.attempts > 0 && <span className="badge" style={{ background: '#ffedd5', color: '#f97316', fontSize: 9 }}>Attempt {del.attempts}/2</span>}
                          </div>
                          <div className="text-muted mt-2" style={{ fontSize: 11 }}>
                            <i className="ri-shopping-bag-line me-1" />{del.items}
                          </div>
                          {del.status === 'shipped' && (
                            <div className="mt-2 d-flex align-items-center gap-1 small" style={{ color: '#3b82f6' }}>
                              <i className="ri-navigation-line" />
                              <span>GPS updating live from Driver App</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Customer / Destination marker */}
                  <Marker
                    position={del.customerPos}
                    icon={customerIcon(del.driver.color)}>
                    <Popup>
                      <div style={{ padding: '12px 14px', minWidth: 200 }}>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <div className="rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: 28, height: 28, background: del.driver.color + '20', color: del.driver.color, fontSize: 10, fontWeight: 700 }}>
                            {del.customer.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="fw-medium small">{del.customer.name}</div>
                            <div className="text-muted" style={{ fontSize: 10 }}>{del.customer.phone}</div>
                          </div>
                        </div>
                        <div className="d-flex align-items-start gap-1 mb-1">
                          <i className="ri-map-pin-fill flex-shrink-0 mt-1" style={{ color: del.driver.color, fontSize: 11 }} />
                          <span className="small">{del.customer.address}</span>
                        </div>
                        <div className="border-top pt-2 mt-2 d-flex justify-content-between">
                          <span className="small text-muted">{del.orderId}</span>
                          <span className="small fw-bold">{fmt(del.total)}</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              )
            })}
          </MapContainer>

          {/* Floating info overlay — selected delivery */}
          {selected && (
            <div style={{
              position: 'absolute', bottom: 20, right: 16, zIndex: 1000,
              background: '#fff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              padding: '12px 16px', maxWidth: 280, borderLeft: `4px solid ${selected.driver.color}`,
            }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 30, height: 30, background: selected.driver.color, color: '#fff', fontSize: 10, fontWeight: 700 }}>
                  {selected.driver.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-grow-1">
                  <div className="fw-medium small">{selected.driver.name}</div>
                  <div className="text-muted" style={{ fontSize: 10 }}>{STATUS_CFG[selected.status].label}</div>
                </div>
                <button className="btn btn-sm btn-outline-secondary p-1" style={{ lineHeight: 1 }}
                  onClick={() => { setSelected(null); setFlyTarget(null) }}>
                  <i className="ri-close-line" style={{ fontSize: 12 }} />
                </button>
              </div>
              <div style={{ fontSize: 12 }}>
                <div><strong>Order:</strong> {selected.orderId}</div>
                <div><strong>Customer:</strong> {selected.customer.name}</div>
                <div className="text-muted">{selected.customer.address}</div>
                {selected.eta !== '—' && <div className="mt-1 text-primary"><i className="ri-time-line me-1" />{selected.eta} remaining</div>}
              </div>
              <a href={`tel:${selected.driver.phone}`} className="btn btn-sm btn-success w-100 mt-2" style={{ fontSize: 11 }}>
                <i className="ri-phone-line me-1" />Call {selected.driver.name.split(' ')[0]}
              </a>
            </div>
          )}

          {/* GPS update indicator */}
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 999,
            background: 'rgba(255,255,255,0.95)', borderRadius: 8,
            padding: '6px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block',
              animation: 'pulse-ring 1.5s ease-out infinite' }} />
            GPS positions updating every 8s
          </div>
        </div>
      </div>
    </div>
  )
}
