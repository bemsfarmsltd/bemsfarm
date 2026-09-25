import React, { useEffect, useMemo, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { io } from "socket.io-client";

// Fix Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Central Bems Farms Fulfillment Hub (Umuahia / Abia State)
const DEFAULT_HUB_COORDS = [5.5249, 7.4943];

// Tile Layer presets (CartoDB Voyager for crisp modern UI, Esri for satellite)
const TILE_LAYERS = {
  streets: {
    name: "Streets",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: ["a", "b", "c", "d"],
    maxZoom: 19,
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    subdomains: [],
    maxZoom: 18,
  },
};

// Custom Hub Icon (Bems Farms Fulfillment Center)
const hubIcon = L.divIcon({
  className: "custom-hub-pin",
  iconSize: [42, 50],
  iconAnchor: [21, 50],
  popupAnchor: [0, -48],
  html: `
    <div style="position:relative;width:42px;height:50px;display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:40px;height:40px;border-radius:50%;
        background:linear-gradient(135deg, #064e3b 0%, #047857 100%);
        color:#ffffff;display:flex;align-items:center;justify-content:center;
        box-shadow:0 8px 20px rgba(4,120,87,0.5);
        border:2.5px solid #ffffff;font-size:19px;
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

// Custom Destination Icon (Customer Doorstep)
const destinationIcon = L.divIcon({
  className: "custom-dest-pin",
  iconSize: [42, 50],
  iconAnchor: [21, 50],
  popupAnchor: [0, -48],
  html: `
    <div style="position:relative;width:42px;height:50px;display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:40px;height:40px;border-radius:50%;
        background:linear-gradient(135deg, #15803d 0%, #16a34a 100%);
        color:#ffffff;display:flex;align-items:center;justify-content:center;
        box-shadow:0 8px 20px rgba(21,128,61,0.5);
        border:2.5px solid #ffffff;font-size:19px;
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

// Custom Live Courier Vehicle Icon with Radar Waves and Heading
function createDriverIcon(vehicleType = "bike", heading = null) {
  const isCar = String(vehicleType).toLowerCase().includes("car") || String(vehicleType).toLowerCase().includes("van");
  const emoji = isCar ? "🚐" : "🛵";
  const hasHeading = heading !== null && heading !== undefined && !Number.isNaN(Number(heading));
  const rotation = hasHeading ? `transform: rotate(${heading}deg);` : "";

  return L.divIcon({
    className: "custom-driver-pin",
    iconSize: [52, 58],
    iconAnchor: [26, 58],
    popupAnchor: [0, -54],
    html: `
      <div style="position:relative;width:52px;height:58px;display:flex;flex-direction:column;align-items:center;">
        <!-- Glowing animated radar rings -->
        <div style="
          position:absolute;top:3px;left:3px;width:46px;height:46px;border-radius:50%;
          background:rgba(245,158,11,0.35);animation:driverPulse 2s infinite ease-out;
        "></div>
        <div style="
          position:absolute;top:-2px;left:-2px;width:56px;height:56px;border-radius:50%;
          border:2px solid rgba(245,158,11,0.4);animation:driverPulseRing 2.4s infinite ease-out;
        "></div>

        <!-- Main vehicle badge with heading arrow if available -->
        <div style="
          position:relative;z-index:2;
          width:46px;height:46px;border-radius:50%;
          background:linear-gradient(135deg, #b45309 0%, #f59e0b 100%);
          color:#ffffff;display:flex;align-items:center;justify-content:center;
          box-shadow:0 8px 24px rgba(217,119,6,0.6);
          border:2.5px solid #ffffff;font-size:22px;
          ${rotation}
        ">
          ${emoji}
        </div>
        <div style="
          width:0;height:0;
          border-left:8px solid transparent;border-right:8px solid transparent;
          border-top:11px solid #b45309;
          margin-top:-2px;
        "></div>
      </div>
    `,
  });
}

// Auto camera controller to keep both driver & destination in view
function MapBoundsAdjuster({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const validPoints = points.filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (validPoints.length === 1) {
      map.setView(validPoints[0], 15, { animate: true });
    } else if (validPoints.length > 1) {
      const bounds = L.latLngBounds(validPoints);
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16, animate: true });
    }
  }, [points, map]);
  return null;
}

export default function LiveOrderMap({
  orderId,
  customerLat,
  customerLng,
  driverLat: initialDriverLat,
  driverLng: initialDriverLng,
  driverId,
  driverName,
  driverPhone,
  vehicleType = "Motorcycle",
  vehiclePlate,
  etaMinutes,
  deliveryAddress,
  orderStatus,
  height = "420px",
}) {
  const [mapStyle, setMapStyle] = useState("streets");
  const [liveDriverLat, setLiveDriverLat] = useState(initialDriverLat);
  const [liveDriverLng, setLiveDriverLng] = useState(initialDriverLng);
  const [liveHeading, setLiveHeading] = useState(null);
  const [liveSpeed, setLiveSpeed] = useState(null);
  const [lastTelemetryAt, setLastTelemetryAt] = useState(null);

  // Sync props when initial changes
  useEffect(() => {
    if (initialDriverLat) setLiveDriverLat(initialDriverLat);
    if (initialDriverLng) setLiveDriverLng(initialDriverLng);
  }, [initialDriverLat, initialDriverLng]);

  // Connect to Socket.io for Real-time GPS pings
  useEffect(() => {
    const rawApi = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const socketBase = rawApi.replace(/\/api\/?$/, "");

    let socket;
    try {
      socket = io(socketBase, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
      });

      const handleTelemetry = (data) => {
        if (!data) return;
        const targetOrder = data.order_id || data.orderId;
        const targetDriver = data.driver_id || data.driverId;

        // Check if matching current order or driver
        const isMatch =
          (orderId && targetOrder && String(targetOrder).toLowerCase() === String(orderId).toLowerCase()) ||
          (driverId && targetDriver && String(targetDriver) === String(driverId));

        if (isMatch && data.latitude && data.longitude) {
          const lat = parseFloat(data.latitude);
          const lng = parseFloat(data.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            setLiveDriverLat(lat);
            setLiveDriverLng(lng);
            if (data.heading != null) setLiveHeading(parseFloat(data.heading));
            if (data.speed != null) setLiveSpeed(parseFloat(data.speed));
            setLastTelemetryAt(new Date());
          }
        }
      };

      if (orderId) {
        socket.on(`order:${orderId}:location`, handleTelemetry);
      }
      socket.on("driver:location", handleTelemetry);
    } catch (_) {}

    return () => {
      if (socket) socket.disconnect();
    };
  }, [orderId, driverId]);

  // Destination coordinates
  const destCoords = useMemo(() => {
    const lat = parseFloat(customerLat);
    const lng = parseFloat(customerLng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      return [lat, lng];
    }
    // Fallback around Umuahia delivery zone
    return [5.529, 7.499];
  }, [customerLat, customerLng]);

  // Live or fallback driver coordinates
  const driverCoords = useMemo(() => {
    const lat = parseFloat(liveDriverLat);
    const lng = parseFloat(liveDriverLng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      return [lat, lng];
    }
    // If not yet broadcasting GPS, place near Central Hub
    return [5.524, 7.493];
  }, [liveDriverLat, liveDriverLng]);

  const hasLiveDriverGps = Number.isFinite(parseFloat(liveDriverLat)) && Number.isFinite(parseFloat(liveDriverLng));
  const isEnRoute = ["shipped", "en_route", "out_for_delivery", "arrived"].includes(String(orderStatus).toLowerCase());

  const driverMarkerIcon = useMemo(
    () => createDriverIcon(vehicleType, liveHeading),
    [vehicleType, liveHeading]
  );

  const mapPoints = useMemo(() => {
    const pts = [destCoords];
    if (isEnRoute || hasLiveDriverGps) {
      pts.push(driverCoords);
    } else {
      pts.push(DEFAULT_HUB_COORDS);
    }
    return pts;
  }, [destCoords, driverCoords, isEnRoute, hasLiveDriverGps]);

  // Dual-layered Polyline route
  const polylinePositions = useMemo(() => {
    if (isEnRoute || hasLiveDriverGps) {
      return [driverCoords, destCoords];
    }
    return [DEFAULT_HUB_COORDS, destCoords];
  }, [driverCoords, destCoords, isEnRoute, hasLiveDriverGps]);

  // External Navigation links
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${driverCoords[0]},${driverCoords[1]}&destination=${destCoords[0]},${destCoords[1]}&travelmode=driving`;
  const appleMapsUrl = `https://maps.apple.com/?saddr=${driverCoords[0]},${driverCoords[1]}&daddr=${destCoords[0]},${destCoords[1]}`;

  const currentTile = TILE_LAYERS[mapStyle] || TILE_LAYERS.streets;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900 isolate z-0 select-none"
      style={{ height }}
    >
      {/* ── TOP HUD CONTROLS & TELEMETRY BAR ── */}
      <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none flex items-center justify-between gap-2 flex-wrap">
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
          {/* Live Status Badge */}
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl shadow-lg border border-white/10 flex items-center gap-2 text-xs font-semibold">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                hasLiveDriverGps ? "bg-emerald-400 animate-ping" : "bg-amber-400"
              }`}
            />
            <span>
              {hasLiveDriverGps
                ? "Live Courier Telemetry"
                : isEnRoute
                ? "Courier Dispatched"
                : "Staged at Central Hub"}
            </span>
            {liveSpeed !== null && liveSpeed > 0 && (
              <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                {Math.round(liveSpeed)} km/h
              </span>
            )}
          </div>

          {/* ETA Badge */}
          {etaMinutes != null && (
            <div className="bg-amber-400 text-emerald-950 px-3 py-1.5 rounded-xl shadow-lg font-black text-xs flex items-center gap-1.5 border border-amber-300">
              <span>⏱️</span>
              <span>ETA: ~{etaMinutes} mins</span>
            </div>
          )}
        </div>

        {/* Map Style Toggle & Google Maps button */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200 flex items-center text-xs font-bold text-slate-700">
            <button
              type="button"
              onClick={() => setMapStyle("streets")}
              className={`px-2.5 py-1 rounded-lg transition ${
                mapStyle === "streets"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "hover:bg-slate-100 text-slate-600"
              }`}
            >
              Streets
            </button>
            <button
              type="button"
              onClick={() => setMapStyle("satellite")}
              className={`px-2.5 py-1 rounded-lg transition ${
                mapStyle === "satellite"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "hover:bg-slate-100 text-slate-600"
              }`}
            >
              Satellite
            </button>
          </div>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open live route in Google Maps"
            className="bg-white/95 hover:bg-white text-slate-800 p-2 rounded-xl shadow-md border border-slate-200 text-xs font-bold flex items-center justify-center transition hover:scale-105"
          >
            🗺️
          </a>
        </div>
      </div>

      {/* ── MAP CONTAINER ── */}
      <MapContainer
        center={destCoords}
        zoom={14}
        scrollWheelZoom={false}
        zoomControl={false}
        style={{ width: "100%", height: "100%", background: "#e2e8f0" }}
      >
        <TileLayer
          key={mapStyle}
          attribution={currentTile.attribution}
          url={currentTile.url}
          subdomains={currentTile.subdomains}
          maxZoom={currentTile.maxZoom}
        />

        <MapBoundsAdjuster points={mapPoints} />

        {/* Central Fulfillment Hub Marker */}
        <Marker position={DEFAULT_HUB_COORDS} icon={hubIcon}>
          <Popup>
            <div className="p-1 text-xs">
              <strong className="text-emerald-900 block font-bold">
                🏢 Bems Farms Central Fulfillment Hub
              </strong>
              <span className="text-slate-600">
                Umuahia Agribusiness Processing &amp; Staging Center
              </span>
            </div>
          </Popup>
        </Marker>

        {/* Customer Destination Marker */}
        <Marker position={destCoords} icon={destinationIcon}>
          <Popup>
            <div className="p-1 text-xs">
              <strong className="text-emerald-900 block font-bold">
                📍 Delivery Destination
              </strong>
              <span className="text-slate-600">
                {deliveryAddress || "Customer Delivery Address"}
              </span>
            </div>
          </Popup>
        </Marker>

        {/* Live Driver Marker */}
        {(isEnRoute || hasLiveDriverGps) && (
          <Marker position={driverCoords} icon={driverMarkerIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <strong className="text-amber-900 block font-bold">
                  🛵 {driverName || "Bems Farms Courier"}
                </strong>
                <span className="text-slate-600 block">
                  Vehicle: {vehicleType || "Courier"} {vehiclePlate ? `(${vehiclePlate})` : ""}
                </span>
                {liveSpeed !== null && (
                  <span className="text-slate-500 block">
                    Speed: {Math.round(liveSpeed)} km/h
                  </span>
                )}
                {driverPhone && (
                  <span className="text-slate-500 block mt-0.5">📞 {driverPhone}</span>
                )}
                <span className="inline-block bg-amber-100 text-amber-900 mt-1 px-1.5 py-0.5 rounded font-bold">
                  En Route to Destination
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* High-End Glowing Navigation Route (Underlay Glow + Dashed Line) */}
        <Polyline
          positions={polylinePositions}
          pathOptions={{
            color: "#065f46",
            weight: 6,
            opacity: 0.85,
            lineCap: "round",
          }}
        />
        <Polyline
          positions={polylinePositions}
          pathOptions={{
            color: "#34d399",
            weight: 3.5,
            dashArray: "8, 12",
            opacity: 0.95,
          }}
        />
      </MapContainer>

      {/* ── FLOATING BOTTOM DRIVER / NAVIGATION BAR ── */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-slate-200/90 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xl flex-shrink-0 border border-amber-300 shadow-sm">
            {vehicleType && String(vehicleType).toLowerCase().includes("van") ? "🚐" : "🛵"}
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>{driverName || "Bems Farms Express Dispatch"}</span>
              {hasLiveDriverGps && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                  LIVE
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {vehicleType || "Express Courier"}
              {vehiclePlate ? ` · Plate: ${vehiclePlate}` : ""}
              {lastTelemetryAt && (
                <span className="ml-1 text-slate-400">
                  · Ping {Math.max(1, Math.round((Date.now() - lastTelemetryAt.getTime()) / 1000))}s ago
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {driverPhone && (
            <a
              href={`tel:${driverPhone}`}
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
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
              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </a>
          )}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <span>🧭</span>
            <span>Google Maps</span>
          </a>
        </div>
      </div>

      <style>{`
        @keyframes driverPulse {
          0% { transform: scale(0.9); opacity: 0.85; }
          50% { transform: scale(1.35); opacity: 0.35; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes driverPulseRing {
          0% { transform: scale(0.8); opacity: 0.7; }
          50% { transform: scale(1.4); opacity: 0.2; }
          100% { transform: scale(1.9); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
