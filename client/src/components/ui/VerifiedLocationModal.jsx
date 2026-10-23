import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../../services/api";
import { normalizeNigerianState, resolveNigerianPostalCode } from "../../utils/nigerianStates";
import {
  loadGoogleMaps,
  getGooglePlacePredictions,
  getGooglePlaceDetails,
  reverseGeocodeGoogle,
} from "../../utils/googleMapsLoader";

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

  // Google Maps state
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);
  const googleMapRef = useRef(null);
  const googleMapInstance = useRef(null);
  const googleMarkerInstance = useRef(null);
  const sessionTokenRef = useRef(null);

  // Initialize Google Maps SDK
  useEffect(() => {
    loadGoogleMaps()
      .then((maps) => {
        setIsGoogleMapsReady(true);
        if (maps?.places?.AutocompleteSessionToken) {
          sessionTokenRef.current = new maps.places.AutocompleteSessionToken();
        }
      })
      .catch((err) => {
        console.error("Google Maps load error:", err);
        setErrorMsg("Failed to load Google Maps. Please check network connection.");
      });
  }, []);

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

  // Setup Google Map instance when modal is opened and Google Maps is ready
  useEffect(() => {
    if (!isOpen || !googleMapRef.current || !window.google?.maps) {
      return;
    }

    const lat = position[0] || defaultCenter[0];
    const lng = position[1] || defaultCenter[1];
    const centerLatLng = { lat, lng };

    if (!googleMapInstance.current) {
      const map = new window.google.maps.Map(googleMapRef.current, {
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

      // Handle marker drag
      marker.addListener("dragend", async (e) => {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        setPosition([newLat, newLng]);

        const revData = await reverseGeocodeGoogle(newLat, newLng);
        const bestAddress = revData?.formatted_address || searchQuery;
        if (bestAddress && !searchQuery) setSearchQuery(bestAddress);
        verifyCoordinates(newLat, newLng, bestAddress);
      });

      // Handle map click
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
    } else {
      googleMapInstance.current.setCenter(centerLatLng);
      if (googleMarkerInstance.current) {
        googleMarkerInstance.current.setPosition(centerLatLng);
      }
    }
  }, [isOpen, isGoogleMapsReady]);

  // Sync Google Map marker when position state changes externally
  useEffect(() => {
    if (googleMapInstance.current && googleMarkerInstance.current && position[0] && position[1]) {
      const latLng = { lat: position[0], lng: position[1] };
      googleMapInstance.current.panTo(latLng);
      googleMarkerInstance.current.setPosition(latLng);
    }
  }, [position]);

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
                {mapEngine === "google" ? "Powered by Google Maps & Landmark Search" : "Pin your doorstep for precise dispatch"}
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

        {/* Interactive Google Map Canvas */}
        <div className="relative w-full h-[280px] sm:h-[320px] bg-gray-100">
          <div
            ref={googleMapRef}
            style={{ width: "100%", height: "100%" }}
            className="google-map-canvas"
          />

          {!isGoogleMapsReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 z-[300] gap-2">
              <span className="text-2xl animate-spin">⏳</span>
              <span className="text-xs font-semibold text-gray-600">Loading Google Maps...</span>
            </div>
          )}

          {/* Floating Instructions */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow border border-gray-200 text-[11px] text-gray-700 z-[400] flex items-center gap-1.5">
            <span>💡</span>
            <span>Click or drag pin to your exact building gate</span>
          </div>

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
