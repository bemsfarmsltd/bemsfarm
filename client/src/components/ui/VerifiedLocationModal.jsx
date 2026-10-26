import React, { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../services/api";
import { normalizeNigerianState, resolveNigerianPostalCode } from "../../utils/nigerianStates";
import {
  loadGoogleMaps,
  getGooglePlacePredictions,
  getGooglePlaceDetails,
  reverseGeocodeGoogle,
  reverseGeocodeNominatim,
  isGoogleMapsAuthFailed,
  onGoogleMapsAuthError,
} from "../../utils/googleMapsLoader";

// Custom Leaflet pin for Bems Farms doorstep delivery
const leafletPinIcon = L.divIcon({
  className: "custom-delivery-pin",
  iconSize: [42, 50],
  iconAnchor: [21, 50],
  popupAnchor: [0, -48],
  html: `
    <div style="position:relative;width:42px;height:50px;display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:40px;height:40px;border-radius:50%;
        background:linear-gradient(135deg, #047857 0%, #064e3b 100%);
        color:#ffffff;display:flex;align-items:center;justify-content:center;
        box-shadow:0 8px 20px rgba(4,120,87,0.5);
        border:2.5px solid #ffffff;font-size:20px;
      ">
        📍
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

  // Map state (Google Maps with seamless Leaflet/OpenStreetMap fallback)
  const [useLeaflet, setUseLeaflet] = useState(() => isGoogleMapsAuthFailed());
  const [isMapReady, setIsMapReady] = useState(false);
  const mapContainerRef = useRef(null);
  const googleMapInstance = useRef(null);
  const googleMarkerInstance = useRef(null);
  const leafletMapInstance = useRef(null);
  const leafletMarkerInstance = useRef(null);
  const sessionTokenRef = useRef(null);

  // Listen for Google Maps auth errors (e.g. domain restriction on bemsfarms.com)
  useEffect(() => {
    const unsubscribe = onGoogleMapsAuthError(() => {
      setUseLeaflet(true);
      setIsMapReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Initialize Maps engine
  useEffect(() => {
    if (isGoogleMapsAuthFailed()) {
      setUseLeaflet(true);
      setIsMapReady(true);
      return;
    }

    loadGoogleMaps()
      .then((maps) => {
        if (!isGoogleMapsAuthFailed()) {
          setIsMapReady(true);
          if (maps?.places?.AutocompleteSessionToken) {
            sessionTokenRef.current = new maps.places.AutocompleteSessionToken();
          }
        } else {
          setUseLeaflet(true);
          setIsMapReady(true);
        }
      })
      .catch((err) => {
        console.warn("Google Maps load failed, switching to Leaflet fallback:", err);
        setUseLeaflet(true);
        setIsMapReady(true);
      });
  }, []);

  // Clean up map instances when modal is closed to prevent stale detached nodes on reopen
  useEffect(() => {
    if (!isOpen) {
      if (googleMapInstance.current) {
        googleMapInstance.current = null;
        googleMarkerInstance.current = null;
      }
      if (leafletMapInstance.current) {
        try {
          leafletMapInstance.current.remove();
        } catch (e) {
          // ignore
        }
        leafletMapInstance.current = null;
        leafletMarkerInstance.current = null;
      }
    }
  }, [isOpen]);

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

  // Setup Map instance when modal is opened and ready
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) {
      return;
    }

    const lat = position[0] || defaultCenter[0];
    const lng = position[1] || defaultCenter[1];

    if (useLeaflet) {
      // Clean up google map if switching
      if (googleMapInstance.current) {
        googleMapInstance.current = null;
        googleMarkerInstance.current = null;
      }

      if (!leafletMapInstance.current) {
        const lMap = L.map(mapContainerRef.current, {
          center: [lat, lng],
          zoom: 16,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(lMap);

        const marker = L.marker([lat, lng], {
          icon: leafletPinIcon,
          draggable: true,
        }).addTo(lMap);

        marker.on("dragend", async (e) => {
          const c = e.target.getLatLng();
          const newLat = c.lat;
          const newLng = c.lng;
          setPosition([newLat, newLng]);

          const revData = await reverseGeocodeNominatim(newLat, newLng);
          const bestAddress = revData?.formatted_address || searchQuery;
          if (bestAddress && !searchQuery) setSearchQuery(bestAddress);
          verifyCoordinates(newLat, newLng, bestAddress);
        });

        lMap.on("click", async (e) => {
          const newLat = e.latlng.lat;
          const newLng = e.latlng.lng;
          marker.setLatLng(e.latlng);
          setPosition([newLat, newLng]);

          const revData = await reverseGeocodeNominatim(newLat, newLng);
          const bestAddress = revData?.formatted_address || searchQuery;
          if (bestAddress && !searchQuery) setSearchQuery(bestAddress);
          verifyCoordinates(newLat, newLng, bestAddress);
        });

        leafletMapInstance.current = lMap;
        leafletMarkerInstance.current = marker;
      } else {
        leafletMapInstance.current.setView([lat, lng], 16);
        if (leafletMarkerInstance.current) {
          leafletMarkerInstance.current.setLatLng([lat, lng]);
        }
      }

      const timer = setTimeout(() => {
        leafletMapInstance.current?.invalidateSize();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      // Google Maps mode
      if (!window.google?.maps) return;

      const centerLatLng = { lat, lng };

      if (!googleMapInstance.current) {
        try {
          const map = new window.google.maps.Map(mapContainerRef.current, {
            center: centerLatLng,
            zoom: 16,
            mapTypeControl: true,
            mapTypeControlOptions: {
              style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
              position: window.google.maps.ControlPosition.TOP_RIGHT,
            },
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
          });

          const marker = new window.google.maps.Marker({
            position: centerLatLng,
            map: map,
            draggable: true,
            animation: window.google.maps.Animation.DROP,
            title: "Bems Farms Delivery Gate",
          });

          marker.addListener("dragend", async (e) => {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            setPosition([newLat, newLng]);

            const revData = await reverseGeocodeGoogle(newLat, newLng);
            const bestAddress = revData?.formatted_address || searchQuery;
            if (bestAddress && !searchQuery) setSearchQuery(bestAddress);
            verifyCoordinates(newLat, newLng, bestAddress);
          });

          map.addListener("click", async (e) => {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            marker.setPosition(e.latLng);
            setPosition([newLat, newLng]);

            const revData = await reverseGeocodeGoogle(newLat, newLng);
            const bestAddress = revData?.formatted_address || searchQuery;
            if (bestAddress && !searchQuery) setSearchQuery(bestAddress);
            verifyCoordinates(newLat, newLng, bestAddress);
          });

          googleMapInstance.current = map;
          googleMarkerInstance.current = marker;
        } catch (gErr) {
          console.warn("Error creating Google Map, falling back to Leaflet:", gErr);
          setUseLeaflet(true);
        }
      } else {
        googleMapInstance.current.setCenter(centerLatLng);
        if (googleMarkerInstance.current) {
          googleMarkerInstance.current.setPosition(centerLatLng);
        }
      }

      const timer = setTimeout(() => {
        if (googleMapInstance.current && window.google?.maps) {
          window.google.maps.event.trigger(googleMapInstance.current, "resize");
          googleMapInstance.current.setCenter(centerLatLng);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, useLeaflet, isMapReady]);

  // Sync Map marker when position state changes externally
  useEffect(() => {
    if (!position[0] || !position[1]) return;
    if (useLeaflet && leafletMapInstance.current && leafletMarkerInstance.current) {
      leafletMapInstance.current.panTo([position[0], position[1]]);
      leafletMarkerInstance.current.setLatLng([position[0], position[1]]);
    } else if (googleMapInstance.current && googleMarkerInstance.current && window.google?.maps) {
      const latLng = { lat: position[0], lng: position[1] };
      googleMapInstance.current.panTo(latLng);
      googleMarkerInstance.current.setPosition(latLng);
    }
  }, [position, useLeaflet]);

  // Initial verification on open
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
        // Try Google search first
        getGooglePlacePredictions(initialAddress, sessionTokenRef.current)
          .then(async (preds) => {
            if (preds && preds.length > 0) {
              const details = await getGooglePlaceDetails(preds[0].place_id, sessionTokenRef.current);
              if (details?.latitude && details?.longitude) {
                const pos = [details.latitude, details.longitude];
                setPosition(pos);
                verifyCoordinates(details.latitude, details.longitude, details.formatted_address);
                return;
              }
            }
            // Fallback to internal search
            const res = await api.get("/locations/search", { params: { q: initialAddress } });
            const results = res.data?.results || [];
            if (results.length > 0) {
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
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        setFallbackSuggestion(null);

        // Try reverse geocode with Google
        const rev = await reverseGeocodeGoogle(lat, lng);
        const addr = rev?.formatted_address || "";
        if (addr) setSearchQuery(addr);

        verifyCoordinates(lat, lng, addr);
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

  // Search input typing handler with Google Places priority
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // 1. Google Places search
        const googleResults = await getGooglePlacePredictions(searchQuery, sessionTokenRef.current);
        if (googleResults && googleResults.length > 0) {
          const formatted = googleResults.slice(0, 5).map((p) => ({
            isGoogle: true,
            place_id: p.place_id,
            display_name: p.description,
            main_text: p.structured_formatting?.main_text || p.description,
            secondary_text: p.structured_formatting?.secondary_text || "",
          }));
          setSearchResults(formatted);
          setIsSearching(false);
          return;
        }

        // 2. Fallback to OpenStreetMap/internal search
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
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchResult = async (result) => {
    setSearchResults([]);
    setFallbackSuggestion(null);

    // Google Place Result
    if (result.isGoogle && result.place_id) {
      setIsSearching(true);
      const details = await getGooglePlaceDetails(result.place_id, sessionTokenRef.current);
      if (window.google?.maps?.places?.AutocompleteSessionToken) {
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      }
      setIsSearching(false);

      if (details?.latitude && details?.longitude) {
        const newPos = [details.latitude, details.longitude];
        setPosition(newPos);
        setSearchQuery(details.formatted_address || result.display_name);
        verifyCoordinates(details.latitude, details.longitude, details.formatted_address);
        return;
      }
    }

    // Standard Result
    const newPos = [result.latitude, result.longitude];
    setPosition(newPos);
    setSearchQuery(result.display_name);
    verifyCoordinates(result.latitude, result.longitude, result.display_name);
  };

  const handleConfirmLocation = async () => {
    const lat = position[0];
    const lng = position[1];

    const finalAddress = (searchQuery && searchQuery.trim().length > 0)
      ? searchQuery.trim()
      : (verifiedData?.formatted_address || initialAddress || "Pinned Delivery Location");

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
      digital_postcode: verifiedData?.digital_postcode || null,
      digital_postcode_display: verifiedData?.digital_postcode_display || null,
      latitude: lat,
      longitude: lng,
      zone_id: zoneId,
      zone_name: verifiedData?.zone?.zone_name || "Standard Zone",
      delivery_fee: deliveryFee,
      verified: true,
    };

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
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
              📍
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Pin Your Exact Delivery Doorstep</h3>
              <p className="text-xs text-emerald-100">
                {useLeaflet
                  ? "Powered by OpenStreetMap & Verified Delivery Zones"
                  : "Powered by Google Maps & Landmark Search"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
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
                className="w-full px-3.5 py-2.5 pl-9 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                placeholder="Search street, estate, bank, or landmark (e.g. Near Abia Tower)..."
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
                      className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-emerald-50 border-b border-gray-50 last:border-0 flex items-start gap-2 transition cursor-pointer"
                      onClick={() => handleSelectSearchResult(res)}
                    >
                      <span className="text-base mt-0.5">📍</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {res.main_text || res.display_name}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {res.secondary_text || res.city || res.state}
                        </div>
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
              className="px-4 py-2.5 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition whitespace-nowrap cursor-pointer"
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

          {fallbackSuggestion && (
            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs flex flex-col gap-2 animate-fadeIn">
              <div className="flex items-start gap-2">
                <span className="text-base leading-none mt-0.5 text-amber-600">⚠️</span>
                <div className="flex-1">
                  <div className="font-bold text-amber-900">
                    Exact building not indexed on map database
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    {fallbackSuggestion.reason || "We identified the closest recognized area. Drag the pin directly to your gate."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Map Canvas (Leaflet / Google Maps) */}
        <div className="relative w-full h-[280px] sm:h-[320px] bg-gray-100">
          <div
            ref={mapContainerRef}
            style={{ width: "100%", height: "100%", zIndex: 1 }}
            className="delivery-map-canvas"
          />

          {!isMapReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 z-[300] gap-2">
              <span className="text-2xl animate-spin">⏳</span>
              <span className="text-xs font-semibold text-gray-600">Loading Map...</span>
            </div>
          )}

          {/* Floating Instructions */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow border border-gray-200 text-[11px] text-gray-700 z-[400] flex items-center gap-1.5 pointer-events-none">
            <span>💡</span>
            <span>Click or drag pin to your exact building gate</span>
          </div>

          {/* Map Mode Badge */}
          {useLeaflet && (
            <div className="absolute top-3 right-3 bg-emerald-900/90 text-white backdrop-blur-sm px-2.5 py-1 rounded-md shadow text-[10px] font-semibold z-[400] flex items-center gap-1">
              <span>🗺️</span>
              <span>Live Street Map</span>
            </div>
          )}

          {isVerifying && (
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow text-xs text-emerald-800 font-medium z-[400] flex items-center gap-2 border border-emerald-200">
              <span className="animate-spin">🔄</span>
              <span>Verifying coordinates and matching delivery zone...</span>
            </div>
          )}
        </div>

        {/* Verification Result Card & Actions */}
        <div className="p-4 bg-white flex flex-col gap-3">
          {verifiedData?.zone ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-900">
                    {verifiedData.zone.zone_name}
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Estimated Delivery: {verifiedData.zone.estimated_delivery_time || "30–60 mins"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">Delivery Fee</div>
                <div className="text-sm font-extrabold text-emerald-800">
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
            <div className="text-xs text-red-600 font-medium px-1">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs text-gray-600 hover:text-gray-900 font-bold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmLocation}
              disabled={isVerifying}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>Confirm Doorstep Location</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
