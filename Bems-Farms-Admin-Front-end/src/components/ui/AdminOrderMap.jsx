import React, { useState, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Central Bems Farms Hub / Store coordinates
const BEMS_HQ_COORDS = [5.5245, 7.4912] // Umuahia Central Distribution Hub

// Custom Store / Hub Icon
const storeIcon = L.divIcon({
  className: '',
  iconSize: [36, 44],
  iconAnchor: [18, 44],
  popupAnchor: [0, -42],
  html: `
    <div style="position:relative;width:36px;height:44px;display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:34px;height:34px;border-radius:50%;
        background:linear-gradient(135deg, #064e3b 0%, #047857 100%);
        color:#ffffff;display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 12px rgba(4,120,87,0.45);
        border:2px solid #ffffff;font-size:16px;
      ">
        🏢
      </div>
      <div style="
        width:0;height:0;
        border-left:6px solid transparent;border-right:6px solid transparent;
        border-top:9px solid #064e3b;
        margin-top:-2px;
      "></div>
    </div>
  `,
})

// Custom Customer Destination Icon
const customerDestIcon = L.divIcon({
  className: '',
  iconSize: [36, 44],
  iconAnchor: [18, 44],
  popupAnchor: [0, -42],
  html: `
    <div style="position:relative;width:36px;height:44px;display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:34px;height:34px;border-radius:50%;
        background:linear-gradient(135deg, #15803d 0%, #16a34a 100%);
        color:#ffffff;display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 12px rgba(21,128,61,0.45);
        border:2px solid #ffffff;font-size:16px;
      ">
        📍
      </div>
      <div style="
        width:0;height:0;
        border-left:6px solid transparent;border-right:6px solid transparent;
        border-top:9px solid #15803d;
        margin-top:-2px;
      "></div>
    </div>
  `,
})

// Custom Live Driver Courier Icon
function createDriverMarkerIcon(name = 'Courier') {
  const initial = (name || 'C').charAt(0).toUpperCase()
  return L.divIcon({
    className: '',
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -46],
    html: `
      <div style="position:relative;width:40px;height:48px;display:flex;flex-direction:column;align-items:center;">
        <div style="
          width:38px;height:38px;border-radius:50%;
          background:linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
          color:#ffffff;display:flex;align-items:center;justify-content:center;
          box-shadow:0 6px 16px rgba(217,119,6,0.5);
          border:2px solid #ffffff;font-size:16px;font-weight:bold;
        ">
          🛵
        </div>
        <div style="
          width:0;height:0;
          border-left:7px solid transparent;border-right:7px solid transparent;
          border-top:10px solid #d97706;
          margin-top:-2px;
        "></div>
      </div>
    `,
  })
}

function MapAutoBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points || points.length === 0) return
    const valid = points.filter(p => p && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    if (valid.length === 1) {
      map.setView(valid[0], 15, { animate: true })
    } else if (valid.length > 1) {
      const bounds = L.latLngBounds(valid)
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true })
    }
  }, [points, map])
  return null
}

export default function AdminOrderMap({
  order,
  height = '240px',
}) {
  const isPos = String(order?.source || order?.channel || '').toLowerCase().includes('pos') ||
                String(order?.source || order?.channel || '').toLowerCase().includes('physical') ||
                String(order?.order_ref || order?.id || '').startsWith('POS-')

  const destCoords = useMemo(() => {
    const lat = parseFloat(order?.latitude || order?.customer_lat)
    const lng = parseFloat(order?.longitude || order?.customer_lng)
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      return [lat, lng]
    }
    return null
  }, [order?.latitude, order?.customer_lat, order?.longitude, order?.customer_lng])

  const driverCoords = useMemo(() => {
    const lat = parseFloat(order?.driver_lat)
    const lng = parseFloat(order?.driver_lng)
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      return [lat, lng]
    }
    return null
  }, [order?.driver_lat, order?.driver_lng])

  const hasDriver = Boolean(order?.driver_name || order?.driver_id || order?.driver)
  const isEnRoute = ['en_route', 'out_for_delivery', 'shipped', 'arrived'].includes(String(order?.status).toLowerCase())

  const mapPoints = useMemo(() => {
    if (isPos) {
      return [BEMS_HQ_COORDS]
    }
    const pts = [BEMS_HQ_COORDS]
    if (destCoords) {
      pts.push(destCoords)
    }
    if (driverCoords) {
      pts.push(driverCoords)
    }
    return pts
  }, [isPos, destCoords, driverCoords])

  const originCoords = useMemo(() => {
    if (driverCoords) {
      return driverCoords
    }
    return BEMS_HQ_COORDS
  }, [driverCoords])

  const [roadPolyline, setRoadPolyline] = useState([])

  useEffect(() => {
    if (isPos || !destCoords) {
      setRoadPolyline([])
      return
    }
    let cancelled = false
    const [startLat, startLng] = originCoords
    const [endLat, endLng] = destCoords
    if (!startLat || !startLng || !endLat || !endLng) return

    fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        if (data.routes && data.routes[0]) {
          const latLngs = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
          setRoadPolyline(latLngs)
        }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [isPos, originCoords[0], originCoords[1], destCoords ? destCoords[0] : null, destCoords ? destCoords[1] : null])

  const polylinePts = useMemo(() => {
    if (isPos || !destCoords) return []
    if (roadPolyline && roadPolyline.length > 0) {
      return roadPolyline
    }
    return [originCoords, destCoords]
  }, [isPos, roadPolyline, originCoords, destCoords])

  const driverMarkerIcon = useMemo(() => createDriverMarkerIcon(order?.driver_name), [order?.driver_name])

  const mapCenter = useMemo(() => {
    if (isPos) return BEMS_HQ_COORDS
    if (destCoords) return destCoords
    if (driverCoords) return driverCoords
    return BEMS_HQ_COORDS
  }, [isPos, destCoords, driverCoords])

  return (
    <div className="rounded-3 overflow-hidden border position-relative shadow-xs" style={{ height, background: '#f8fafc' }}>
      {/* Top Map Status Tag */}
      <div className="position-absolute d-flex align-items-center justify-content-between gap-2 px-2 py-1 m-2 rounded-2 bg-dark bg-opacity-75 text-white"
        style={{ zIndex: 1000, fontSize: 11, fontWeight: 600, backdropFilter: 'blur(4px)' }}>
        <div className="d-flex align-items-center gap-1.5">
          <span className="rounded-circle" style={{ width: 7, height: 7, background: isPos ? '#38bdf8' : (isEnRoute ? '#3b82f6' : '#4ade80') }} />
          <span>{isPos ? '🏬 In-Store Fulfillment Hub' : (isEnRoute ? '🛵 Driver En Route (Live)' : '📍 Delivery Location & Hub')}</span>
        </div>
        {order?.eta_minutes && (
          <span className="badge bg-warning text-dark px-1.5 py-0.5" style={{ fontSize: 10 }}>
            ETA: ~{order.eta_minutes}m
          </span>
        )}
      </div>

      {/* Safety Notice Overlay if destination GPS is missing */}
      {!isPos && !destCoords && (
        <div className="position-absolute start-0 end-0 bottom-0 p-2 m-2 rounded-2 bg-amber-50 border border-amber-300 text-amber-900 d-flex align-items-center gap-2"
          style={{ zIndex: 1000, fontSize: 11, background: 'rgba(254, 243, 199, 0.95)', backdropFilter: 'blur(4px)' }}>
          <i className="ri-error-warning-line text-warning fs-6" />
          <span><strong>Delivery GPS Unpinned:</strong> Recipient address is not geocoded. Routing cannot be calculated.</span>
        </div>
      )}

      {/* Driver GPS Offline Notice if driver is assigned but hasn't pinged in 30 mins */}
      {!isPos && hasDriver && !driverCoords && (
        <div className="position-absolute start-0 end-0 top-0 mt-5 mx-2 p-1.5 rounded-2 bg-light border border-secondary text-dark d-flex align-items-center gap-1.5"
          style={{ zIndex: 999, fontSize: 10.5, background: 'rgba(248, 250, 252, 0.92)', backdropFilter: 'blur(4px)' }}>
          <i className="ri-signal-wifi-off-line text-danger" />
          <span><strong>Courier Telemetry Offline:</strong> {order?.driver_name || 'Driver'} phone has not reported GPS in &gt; 30 minutes.</span>
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains={['a', 'b', 'c']}
          maxZoom={19}
        />

        <MapAutoBounds points={mapPoints} />

        {/* Central Store / Hub Marker */}
        <Marker position={BEMS_HQ_COORDS} icon={storeIcon}>
          <Popup>
            <div style={{ fontSize: 12 }}>
              <strong>🏢 Bems Farms Central Hub</strong>
              <div className="text-muted">Umuahia Store &amp; Fulfillment Center</div>
            </div>
          </Popup>
        </Marker>

        {/* Customer Destination Marker (Only when real coordinates exist) */}
        {!isPos && destCoords && (
          <Marker position={destCoords} icon={customerDestIcon}>
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>📍 Delivery Destination</strong>
                <div>{order?.address || order?.delivery_address || 'Customer Delivery Address'}</div>
                {order?.delivery_city && <div className="text-muted">{order.delivery_city}</div>}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Assigned Driver Marker (Only when real fresh GPS exists) */}
        {!isPos && hasDriver && driverCoords && (
          <Marker position={driverCoords} icon={driverMarkerIcon}>
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>🛵 {order?.driver_name || 'Assigned Courier'}</strong>
                <div className="text-muted">
                  {order?.driver_plate ? `Plate: ${order.driver_plate}` : 'Courier Assigned'}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Line (Only when real destination exists) */}
        {!isPos && destCoords && polylinePts.length > 0 && (
          <Polyline
            positions={polylinePts}
            pathOptions={{
              color: '#15803d',
              weight: 3.5,
              dashArray: '6, 6',
              opacity: 0.85,
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
