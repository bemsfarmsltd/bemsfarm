import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Central Bems Farms Fulfillment Hub (Umuahia / Abia State)
const DEFAULT_HUB_COORDS = [5.5249, 7.4943];

// Custom Hub Icon
const hubIcon = L.divIcon({
  className: "custom-hub-pin",
  iconSize: [40, 48],
  iconAnchor: [20, 48],
  popupAnchor: [0, -48],
  html: `
    <div style="position:relative;width:40px;height:48px;display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:38px;height:38px;border-radius:50%;
        background:linear-gradient(135deg, #064e3b 0%, #047857 100%);
        color:#ffffff;display:flex;align-items:center;justify-content:center;
        box-shadow:0 6px 16px rgba(4,120,87,0.45);
        border:2.5px solid #ffffff;font-size:18px;
      ">
        🏢
      </div>
      <div style="
        width:0;height:0;
        border-left:7px solid transparent;border-right:7px solid transparent;
        border-top:10px solid #064e3b;
        margin-top:-2px;
      "></div>
    </div>
  `,
});

// Custom Destination Icon (Customer Home)
const destinationIcon = L.divIcon({
  className: "custom-dest-pin",
  iconSize: [40, 48],
  iconAnchor: [20, 48],
  popupAnchor: [0, -48],
  html: `
    <div style="position:relative;width:40px;height:48px;display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:38px;height:38px;border-radius:50%;
        background:linear-gradient(135deg, #15803d 0%, #16a34a 100%);
        color:#ffffff;display:flex;align-items:center;justify-content:center;
        box-shadow:0 6px 16px rgba(21,128,61,0.45);
        border:2.5px solid #ffffff;font-size:18px;
      ">
        📍
      </div>
      <div style="
        width:0;height:0;
        border-left:7px solid transparent;border-right:7px solid transparent;
        border-top:10px solid #15803d;
        margin-top:-2px;
      "></div>
    </div>
  `,
});

// Custom Real-time Driver Icon (Courier Bike/Van with Live Radar Pulse)
function createDriverIcon(vehicleType = "bike") {
  const isCar = String(vehicleType).toLowerCase().includes("car") || String(vehicleType).toLowerCase().includes("van");
  const emoji = isCar ? "🚐" : "🛵";
  return L.divIcon({
    className: "custom-driver-pin",
    iconSize: [46, 54],
    iconAnchor: [23, 54],
    popupAnchor: [0, -52],
    html: `
      <div style="position:relative;width:46px;height:54px;display:flex;flex-direction:column;align-items:center;">
        <!-- Pulsing radar ring -->
        <div style="
          position:absolute;top:2px;left:2px;width:42px;height:42px;border-radius:50%;
          background:rgba(245,158,11,0.35);animation:driverPulse 2s infinite ease-out;
        "></div>
        <div style="
          position:relative;z-index:2;
          width:42px;height:42px;border-radius:50%;
          background:linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
          color:#ffffff;display:flex;align-items:center;justify-content:center;
          box-shadow:0 8px 20px rgba(217,119,6,0.5);
          border:2.5px solid #ffffff;font-size:20px;
        ">
          ${emoji}
        </div>
        <div style="
          width:0;height:0;
          border-left:8px solid transparent;border-right:8px solid transparent;
          border-top:11px solid #d97706;
          margin-top:-2px;
        "></div>
      </div>
    `,
  });
}

// Auto-bounds adjuster to fit both driver and destination
function MapBoundsAdjuster({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const validPoints = points.filter(p => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (validPoints.length === 1) {
      map.setView(validPoints[0], 15, { animate: true });
    } else if (validPoints.length > 1) {
      const bounds = L.latLngBounds(validPoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
    }
  }, [points, map]);
  return null;
}

export default function LiveOrderMap({
  customerLat,
  customerLng,
  driverLat,
  driverLng,
  driverName,
  driverPhone,
  vehicleType,
  vehiclePlate,
  etaMinutes,
  deliveryAddress,
  orderStatus,
  height = "380px",
}) {
  // Destination coordinates
  const destCoords = useMemo(() => {
    const lat = parseFloat(customerLat);
    const lng = parseFloat(customerLng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      return [lat, lng];
    }
    // Fallback around Umuahia delivery zone
    return [5.5290, 7.4990];
  }, [customerLat, customerLng]);

  // Driver coordinates (if actively en route)
  const driverCoords = useMemo(() => {
    const lat = parseFloat(driverLat);
    const lng = parseFloat(driverLng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      return [lat, lng];
    }
    // If driver is not yet sending GPS or awaiting pickup, stage near hub
    return [5.5240, 7.4930];
  }, [driverLat, driverLng]);

  const hasLiveDriverGps = Number.isFinite(parseFloat(driverLat)) && Number.isFinite(parseFloat(driverLng));
  const isEnRoute = ["shipped", "en_route", "out_for_delivery", "arrived"].includes(String(orderStatus).toLowerCase());
  const driverMarkerIcon = useMemo(() => createDriverIcon(vehicleType), [vehicleType]);

  const mapPoints = useMemo(() => {
    const pts = [destCoords];
    if (isEnRoute || hasLiveDriverGps) {
      pts.push(driverCoords);
    } else {
      pts.push(DEFAULT_HUB_COORDS);
    }
    return pts;
  }, [destCoords, driverCoords, isEnRoute, hasLiveDriverGps]);

  const polylinePositions = useMemo(() => {
    if (isEnRoute || hasLiveDriverGps) {
      return [driverCoords, destCoords];
    }
    return [DEFAULT_HUB_COORDS, destCoords];
  }, [driverCoords, destCoords, isEnRoute, hasLiveDriverGps]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-100 isolate z-0" style={{ height }}>
      {/* Live Map Overlay Banner */}
      <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none flex items-center justify-between gap-2 flex-wrap">
        <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-md border border-white/10 flex items-center gap-2 text-xs font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{hasLiveDriverGps ? "Live GPS Telemetry Active" : "Staged at Dispatch Hub"}</span>
        </div>

        {etaMinutes != null && (
          <div className="bg-amber-400 text-emerald-950 px-3 py-1.5 rounded-xl shadow-md font-black text-xs flex items-center gap-1.5 border border-amber-300">
            <span>⏱️</span>
            <span>ETA: ~{etaMinutes} mins remaining</span>
          </div>
        )}
      </div>

      <MapContainer
        center={destCoords}
        zoom={14}
        scrollWheelZoom={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsAdjuster points={mapPoints} />

        {/* Central Hub Marker */}
        <Marker position={DEFAULT_HUB_COORDS} icon={hubIcon}>
          <Popup>
            <div className="p-1 text-xs">
              <strong className="text-emerald-900 d-block font-bold">🏢 Bems Farms Central Dispatch Hub</strong>
              <span className="text-slate-600">Abia State Fulfillment &amp; Staging Center</span>
            </div>
          </Popup>
        </Marker>

        {/* Customer Destination Marker */}
        <Marker position={destCoords} icon={destinationIcon}>
          <Popup>
            <div className="p-1 text-xs">
              <strong className="text-emerald-900 d-block font-bold">📍 Delivery Destination</strong>
              <span className="text-slate-600">{deliveryAddress || "Customer Delivery Address"}</span>
            </div>
          </Popup>
        </Marker>

        {/* Live Driver Marker */}
        {(isEnRoute || hasLiveDriverGps) && (
          <Marker position={driverCoords} icon={driverMarkerIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <strong className="text-amber-900 d-block font-bold">
                  🛵 {driverName || "Bems Farms Courier"}
                </strong>
                <span className="text-slate-600 d-block">
                  Vehicle: {vehicleType || "Motorcycle"} {vehiclePlate ? `(${vehiclePlate})` : ""}
                </span>
                {driverPhone && (
                  <span className="text-slate-500 d-block mt-0.5">📞 {driverPhone}</span>
                )}
                <span className="badge bg-amber-100 text-amber-900 mt-1 d-inline-block px-1.5 py-0.5 rounded">
                  En Route to Destination
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Delivery Route Line */}
        <Polyline
          positions={polylinePositions}
          pathOptions={{
            color: "#059669",
            weight: 4,
            dashArray: "8, 8",
            opacity: 0.8,
          }}
        />
      </MapContainer>

      {/* Floating Driver Info Bar (Bottom) */}
      {driverName && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-lg border border-slate-200/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-base flex-shrink-0 border border-amber-200">
              🛵
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">{driverName}</div>
              <div className="text-[11px] text-slate-500">
                {vehicleType || "Courier"} {vehiclePlate ? `· ${vehiclePlate}` : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {driverPhone && (
              <a
                href={`tel:${driverPhone}`}
                className="bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 text-decoration-none"
              >
                <span>📞</span>
                <span>Call Courier</span>
              </a>
            )}
            {driverPhone && (
              <a
                href={`https://wa.me/${driverPhone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="bg-amber-400 hover:bg-amber-300 text-emerald-950 px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 text-decoration-none"
              >
                <span>💬</span>
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes driverPulse {
          0% { transform: scale(0.9); opacity: 0.8; }
          50% { transform: scale(1.4); opacity: 0.3; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
