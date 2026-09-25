import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../services/api";
import { normalizeNigerianState, resolveNigerianPostalCode } from "../../utils/nigerianStates";

// Fix Leaflet icon URLs in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom Delivery Pin Icon
const pinIcon = L.divIcon({
  className: "custom-delivery-pin",
  iconSize: [38, 48],
  iconAnchor: [19, 48],
  popupAnchor: [0, -50],
  html: `
    <div style="position:relative;width:38px;height:48px;display:flex;flex-direction:column;align-items:center;">
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

// Helper component to smoothly pan map when center changes
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom() < 15 ? 16 : map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

// Helper component to handle map clicks for pin placement
function MapClickHandler({ onLocationClicked }) {
  useMapEvents({
    click(e) {
      if (e.latlng) {
        onLocationClicked([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

export default function VerifiedLocationModal({
  isOpen,
  onClose,
  onLocationConfirmed,
  initialAddress = "",
  initialLat = null,
  initialLng = null,
  showSaveToAccount = false,
}) {
  // Default coordinate: Umuahia, Abia State
  const defaultCenter = [5.5245, 7.4912];
  const [position, setPosition] = useState(
    initialLat && initialLng ? [parseFloat(initialLat), parseFloat(initialLng)] : defaultCenter
  );
  const [searchQuery, setSearchQuery] = useState(initialAddress || "");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedData, setVerifiedData] = useState(null);
  const [fallbackSuggestion, setFallbackSuggestion] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [saveToAccount, setSaveToAccount] = useState(showSaveToAccount);

  // Reverse geocode and verify location whenever pin position changes
  const verifyCoordinates = useCallback(async (lat, lng, addressHint = "") => {
    setIsVerifying(true);
    setErrorMsg("");
    try {
      const res = await api.post("/locations/verify", {
        latitude: lat,
        longitude: lng,
        address: addressHint,
      });

      if (res.data && res.data.verified) {
        setVerifiedData(res.data);
      }
    } catch (err) {
      console.error("Verification failed:", err);
      setErrorMsg("Could not verify zone automatically. You can still confirm your pinned location.");
    } finally {
      setIsVerifying(false);
    }
  }, []);

  // Initial verification on open: align by coordinates or search query
  useEffect(() => {
    if (isOpen) {
      setFallbackSuggestion(null);
      setErrorMsg("");
      if (initialLat && initialLng) {
        const lat = parseFloat(initialLat);
        const lng = parseFloat(initialLng);
        setPosition([lat, lng]);
        verifyCoordinates(lat, lng, initialAddress);
      } else if (initialAddress && initialAddress.trim().length >= 3) {
        setSearchQuery(initialAddress);
        setIsSearching(true);
        api.get("/locations/search", { params: { q: initialAddress } })
          .then((res) => {
            const results = res.data?.results || [];
            if (res.data?.exactMatch && results.length > 0) {
              const first = results[0];
              const pos = [first.latitude, first.longitude];
              setPosition(pos);
              setFallbackSuggestion(null);
              verifyCoordinates(first.latitude, first.longitude, first.display_name);
            } else if (res.data?.closestMatch) {
              const closest = res.data.closestMatch;
              setPosition([closest.latitude, closest.longitude]);
              setFallbackSuggestion(closest);
              verifyCoordinates(closest.latitude, closest.longitude, closest.display_name);
            } else if (results.length > 0) {
              const first = results[0];
              setPosition([first.latitude, first.longitude]);
              verifyCoordinates(first.latitude, first.longitude, first.display_name);
            } else {
              verifyCoordinates(defaultCenter[0], defaultCenter[1], initialAddress);
            }
          })
          .catch(() => {
            verifyCoordinates(defaultCenter[0], defaultCenter[1], initialAddress);
          })
          .finally(() => setIsSearching(false));
      } else {
        verifyCoordinates(defaultCenter[0], defaultCenter[1]);
      }
    }
  }, [isOpen]);

  // Handle GPS location detection
  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        setFallbackSuggestion(null);
        verifyCoordinates(lat, lng);
        setIsLocating(false);
      },
      (err) => {
        console.warn("GPS error:", err.message);
        setIsLocating(false);
        verifyCoordinates(position[0], position[1]);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const applyClosestSuggestion = (closest) => {
    if (!closest) return;
    const newPos = [closest.latitude, closest.longitude];
    setPosition(newPos);
    setFallbackSuggestion(null);
    setSearchResults([]);
    verifyCoordinates(closest.latitude, closest.longitude, closest.display_name);
  };

  // Debounced search for Nominatim OpenStreetMap
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/locations/search`, { params: { q: searchQuery } });
        setSearchResults(res.data?.results || []);
        if (res.data?.exactMatch === false && res.data?.closestMatch) {
          setFallbackSuggestion(res.data.closestMatch);
        } else if (res.data?.exactMatch === true) {
          setFallbackSuggestion(null);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchResult = (result) => {
    const newPos = [result.latitude, result.longitude];
    setPosition(newPos);
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setFallbackSuggestion(null);
    verifyCoordinates(result.latitude, result.longitude, result.display_name);
  };

  const handleMarkerDragEnd = (e) => {
    const marker = e.target;
    if (marker) {
      const latlng = marker.getLatLng();
      const newPos = [latlng.lat, latlng.lng];
      setPosition(newPos);
      verifyCoordinates(latlng.lat, latlng.lng);
    }
  };

  const handleMapClick = (coords) => {
    setPosition(coords);
    verifyCoordinates(coords[0], coords[1]);
  };

  const handleConfirmLocation = async () => {
    const lat = position[0];
    const lng = position[1];
    
    // CRITICAL: Preserve customer's exact words in address field. Never overwrite with generic landmark.
    const finalAddress = (initialAddress && initialAddress.trim().length > 0)
      ? initialAddress.trim()
      : (searchQuery && searchQuery.trim().length > 0 ? searchQuery.trim() : verifiedData?.formatted_address || "Pinned Delivery Location");

    const city = verifiedData?.city || verifiedData?.lga || "Umuahia";
    const lga = verifiedData?.lga || verifiedData?.city || "Umuahia North";
    const state = normalizeNigerianState(verifiedData?.state || "Abia");
    const postalCode = verifiedData?.postal_code || verifiedData?.postcode || resolveNigerianPostalCode(state, city || lga, "", finalAddress);
    const zoneId = verifiedData?.zone?.zone_id || "ZONE001";
    const deliveryFee = verifiedData?.zone?.delivery_fee || 1000;

    const payload = {
      address: finalAddress,
      street_address: finalAddress,
      matched_area: verifiedData?.formatted_address || fallbackSuggestion?.display_name || "",
      city,
      lga,
      state,
      postal_code: postalCode,
      postcode: postalCode,
      latitude: lat,
      longitude: lng,
      zone_id: zoneId,
      zone_name: verifiedData?.zone?.zone_name || "Standard Zone",
      delivery_fee: deliveryFee,
      verified: true,
    };

    // Save to user address book only if explicitly enabled (e.g. standalone prompt) and user is logged in
    const token = typeof window !== "undefined" ? (localStorage.getItem("token") || sessionStorage.getItem("token")) : null;
    if (showSaveToAccount && saveToAccount && token) {
      try {
        await api.post("/addresses", {
          label: "Home / Office",
          street_address: finalAddress,
          city,
          state,
          postal_code: postalCode,
          latitude: lat,
          longitude: lng,
          is_default: true,
        }).catch(() => {});
      } catch (e) {
        // silent catch
      }
    }

    if (onLocationConfirmed) {
      onLocationConfirmed(payload);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-green-800 to-green-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
              📍
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Verify Your Delivery Location</h3>
              <p className="text-xs text-green-100">Pin your exact building or gate so our driver navigates directly to you</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Search & GPS Action Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-2.5 relative">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                className="w-full px-3.5 py-2.5 pl-9 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                placeholder="Search street, estate, or landmark in Nigeria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="absolute left-3 top-3 text-gray-400 text-sm">🔍</span>
              {isSearching && (
                <span className="absolute right-3 top-3 text-xs text-gray-400 animate-spin">⏳</span>
              )}

              {/* Search Dropdown Results */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-200 z-[1000] overflow-hidden max-h-56 overflow-y-auto">
                  {searchResults.map((res, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-green-50 border-b border-gray-50 last:border-0 flex items-start gap-2 transition"
                      onClick={() => handleSelectSearchResult(res)}
                    >
                      <span className="text-base mt-0.5">📍</span>
                      <div>
                        <div className="font-medium text-gray-900">{res.display_name}</div>
                        <div className="text-[10px] text-gray-500">{res.city ? `${res.city}, ` : ''}{res.state}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={detectCurrentLocation}
              disabled={isLocating}
              className="px-4 py-2.5 bg-white hover:bg-green-50 border border-green-300 text-green-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition whitespace-nowrap"
            >
              {isLocating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Detecting GPS...</span>
                </>
              ) : (
                <>
                  <span>🎯</span>
                  <span>Use My Location</span>
                </>
              )}
            </button>
          </div>

          {/* Smart Fallback & Distance Banner (When exact landmark not indexed) */}
          {fallbackSuggestion && (
            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs flex flex-col gap-2 animate-fadeIn">
              <div className="flex items-start gap-2">
                <span className="text-base leading-none mt-0.5 text-amber-600">⚠️</span>
                <div className="flex-1">
                  <div className="font-bold text-amber-900">
                    Exact building or shop name not located on map database
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    {fallbackSuggestion.reason || "We identified the closest recognized area and calculated proximity."}
                  </p>
                  <div className="mt-1 font-semibold text-amber-950 flex flex-wrap items-center gap-1.5">
                    <span>📍 Closest Area:</span>
                    <span className="underline decoration-amber-400">{fallbackSuggestion.display_name}</span>
                    {fallbackSuggestion.distance_km > 0 && (
                      <span className="bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        ~{fallbackSuggestion.distance_km} km
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/70 mt-0.5">
                <button
                  type="button"
                  onClick={() => applyClosestSuggestion(fallbackSuggestion)}
                  className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold text-[11px] rounded-lg shadow-sm transition flex items-center gap-1"
                >
                  <span>✓ Use Closest Area</span>
                </button>
                <button
                  type="button"
                  onClick={detectCurrentLocation}
                  className="px-3 py-1.5 bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 font-bold text-[11px] rounded-lg transition flex items-center gap-1"
                >
                  <span>🎯 Use My Present GPS Location</span>
                </button>
                <span className="text-[10px] text-amber-800 italic ml-auto">
                  (Or click / drag pin on map to your exact building)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Map Canvas */}
        <div className="relative w-full h-[260px] sm:h-[300px] bg-gray-100">
          <MapContainer
            center={position}
            zoom={16}
            style={{ width: "100%", height: "100%" }}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <MapRecenter center={position} />
            <MapClickHandler onLocationClicked={handleMapClick} />
            <Marker
              position={position}
              icon={pinIcon}
              draggable={true}
              eventHandlers={{
                dragend: handleMarkerDragEnd,
              }}
            >
              <Popup>
                <div className="text-xs p-1">
                  <strong>Delivery Pin Location</strong>
                  <p className="text-[10px] text-gray-500 mt-1">Drag marker or click map to adjust gate position.</p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Floating Instructions */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow border border-gray-200 text-[11px] text-gray-700 z-[400] flex items-center gap-1.5">
            <span>💡</span>
            <span>Click or drag pin to your exact building gate</span>
          </div>

          {isVerifying && (
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow text-xs text-green-800 font-medium z-[400] flex items-center gap-2 border border-green-200">
              <span className="animate-spin">🔄</span>
              <span>Verifying coordinates and matching delivery zone...</span>
            </div>
          )}
        </div>

        {/* Verification Result Card & Actions */}
        <div className="p-4 bg-white flex flex-col gap-3">
          {verifiedData?.zone ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-bold text-green-900">
                    {verifiedData.zone.zone_name}
                  </div>
                  <div className="text-[11px] text-green-700">
                    Estimated Time: {verifiedData.zone.estimated_delivery_time || "1–2 hours"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">Delivery Fee</div>
                <div className="text-sm font-extrabold text-green-800">
                  ₦{Number(verifiedData.zone.delivery_fee || 1000).toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 flex items-center gap-2">
              <span>📍</span>
              <span className="truncate">
                {verifiedData?.formatted_address || searchQuery || `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`}
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            {showSaveToAccount ? (
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToAccount}
                  onChange={(e) => setSaveToAccount(e.target.checked)}
                  className="rounded text-green-600 focus:ring-green-500"
                />
                <span>Save as my default delivery address</span>
              </label>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLocation}
                className="px-5 py-2 bg-green-700 hover:bg-green-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <span>Confirm & Pin Location</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
