import React, { useState, useRef, useEffect, useCallback } from "react";
import VerifiedLocationModal from "./VerifiedLocationModal";
import api from "../../services/api";
import {
  loadGoogleMaps,
  getGooglePlacePredictions,
  getGooglePlaceDetails,
} from "../../utils/googleMapsLoader";

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  onPlaceSelected, 
  placeholder = "Enter your street address or landmark (e.g. Near Abia Tower, Umuahia)", 
  className = "", 
  style,
  required,
  disabled,
  initialLat = null,
  initialLng = null,
  showMapButton = true,
  autoTriggerPin = true,
}) {
  const [inputValue, setInputValue] = useState(value || "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasVerifiedCoords, setHasVerifiedCoords] = useState(Boolean(initialLat && initialLng));
  const [pinnedDetails, setPinnedDetails] = useState(null);

  const wrapperRef = useRef(null);
  const searchTimerRef = useRef(null);
  const sessionTokenRef = useRef(null);

  // Initialize Google Places session token for cost-effective bundling
  useEffect(() => {
    loadGoogleMaps()
      .then((maps) => {
        if (maps?.places?.AutocompleteSessionToken) {
          sessionTokenRef.current = new maps.places.AutocompleteSessionToken();
        }
      })
      .catch(() => {
        // Fallback silently if Google Maps is not reachable
      });
  }, []);

  // Sync internal value if external value changes
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Sync verified coords if parent updates latitude / longitude
  useEffect(() => {
    const isPinned = Boolean(initialLat && initialLng);
    setHasVerifiedCoords(isPinned);
    if (!isPinned) {
      setPinnedDetails(null);
    }
  }, [initialLat, initialLng]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Auto-pin handler when an address is recognized
  const autoPinLocation = useCallback(async (text, targetSuggestion = null) => {
    if (!text || text.trim().length < 4) return;
    try {
      let suggestion = targetSuggestion;
      if (!suggestion) {
        const res = await api.get("/locations/search", { params: { q: text.trim() } });
        const list = res.data?.results || [];
        suggestion = list.length > 0 ? list[0] : (res.data?.closestMatch || null);
      }

      if (suggestion && suggestion.latitude && suggestion.longitude) {
        // Verify zone with backend
        const verifyRes = await api.post("/locations/verify", {
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
          address: text,
          city: suggestion.city,
          state: suggestion.state,
        });

        const resolvedData = {
          address: text,
          street_address: text,
          city: verifyRes.data?.city || suggestion.city || suggestion.lga,
          lga: verifyRes.data?.lga || suggestion.lga || verifyRes.data?.city || suggestion.city,
          state: verifyRes.data?.state || suggestion.state,
          postal_code: verifyRes.data?.postal_code || suggestion.postal_code || "440221",
          postcode: verifyRes.data?.postal_code || suggestion.postal_code || "440221",
          digital_postcode: verifyRes.data?.digital_postcode || null,
          digital_postcode_display: verifyRes.data?.digital_postcode_display || null,
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
          zone_id: verifyRes.data?.zone?.zone_id || "ZONE001",
          zone_name: verifyRes.data?.zone?.zone_name,
          delivery_fee: (verifyRes.data?.zone?.delivery_fee !== undefined && verifyRes.data?.zone?.delivery_fee !== null && !isNaN(Number(verifyRes.data.zone.delivery_fee)))
            ? Number(verifyRes.data.zone.delivery_fee)
            : 1000,
          verified: true,
        };

        setHasVerifiedCoords(true);
        setPinnedDetails(resolvedData);

        if (onPlaceSelected) {
          onPlaceSelected(resolvedData);
        }
        return true;
      }
    } catch (err) {
      console.warn("Auto-pin background lookup error:", err);
    }
    return false;
  }, [onPlaceSelected]);

  // Handle typing in the input
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputValue(text);
    setHasVerifiedCoords(false);
    setPinnedDetails(null);

    if (onChange) {
      onChange(e);
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    // Debounced dropdown suggestions search
    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // 1. First priority: Google Places Autocomplete (High accuracy for Nigerian landmarks)
        const googlePredictions = await getGooglePlacePredictions(text, sessionTokenRef.current);
        if (googlePredictions && googlePredictions.length > 0) {
          const formatted = googlePredictions.slice(0, 5).map((p) => ({
            isGoogle: true,
            place_id: p.place_id,
            main_text: p.structured_formatting?.main_text || p.description,
            secondary_text: p.structured_formatting?.secondary_text || "",
            display_name: p.description,
          }));
          setSuggestions(formatted);
          setIsSearching(false);
          return;
        }

        // 2. Fallback: Internal backend / OSM geocoder
        const res = await api.get("/locations/search", { params: { q: text.trim() } });
        let list = res.data?.results || [];
        if (list.length === 0 && res.data?.closestMatch) {
          list = [res.data.closestMatch];
        }
        setSuggestions(list);
      } catch (err) {
        // silent catch
      } finally {
        setIsSearching(false);
      }
    }, 280);
  };

  // When customer clicks a suggestion
  const handleSelectSuggestion = async (suggestion) => {
    const address = suggestion.display_name || suggestion.main_text;
    setInputValue(address);
    setSuggestions([]);

    if (onChange) {
      onChange({ target: { value: address } });
    }

    // A. If selected from Google Places:
    if (suggestion.isGoogle && suggestion.place_id) {
      setIsSearching(true);
      try {
        const placeDetails = await getGooglePlaceDetails(suggestion.place_id, sessionTokenRef.current);
        // Reset session token for next search
        if (window.google?.maps?.places?.AutocompleteSessionToken) {
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        }

        if (placeDetails && placeDetails.latitude && placeDetails.longitude) {
          // Verify with backend delivery zones
          const verifyRes = await api.post("/locations/verify", {
            latitude: placeDetails.latitude,
            longitude: placeDetails.longitude,
            address: placeDetails.formatted_address || address,
            city: placeDetails.city,
            state: placeDetails.state,
          });

          const resolvedData = {
            address: placeDetails.formatted_address || address,
            street_address: placeDetails.formatted_address || address,
            city: verifyRes.data?.city || placeDetails.city,
            lga: verifyRes.data?.lga || placeDetails.lga || placeDetails.city,
            state: verifyRes.data?.state || placeDetails.state,
            postal_code: verifyRes.data?.postal_code || placeDetails.postal_code || "440221",
            postcode: verifyRes.data?.postal_code || placeDetails.postal_code || "440221",
            digital_postcode: verifyRes.data?.digital_postcode || null,
            digital_postcode_display: verifyRes.data?.digital_postcode_display || null,
            latitude: placeDetails.latitude,
            longitude: placeDetails.longitude,
            zone_id: verifyRes.data?.zone?.zone_id || "ZONE001",
            zone_name: verifyRes.data?.zone?.zone_name,
            delivery_fee: (verifyRes.data?.zone?.delivery_fee !== undefined && verifyRes.data?.zone?.delivery_fee !== null && !isNaN(Number(verifyRes.data.zone.delivery_fee)))
              ? Number(verifyRes.data.zone.delivery_fee)
              : 1000,
            verified: true,
          };

          setHasVerifiedCoords(true);
          setPinnedDetails(resolvedData);

          if (onPlaceSelected) {
            onPlaceSelected(resolvedData);
          }
          setIsSearching(false);
          return;
        }
      } catch (gErr) {
        console.warn("Google place detail resolution error:", gErr);
      } finally {
        setIsSearching(false);
      }
    }

    // B. Fallback to standard internal resolver
    await autoPinLocation(address, suggestion);
  };

  const handleLocationConfirmed = (locationData) => {
    setInputValue(locationData.address);
    setHasVerifiedCoords(true);
    setPinnedDetails(locationData);
    setIsModalOpen(false);

    if (onChange) {
      onChange({ target: { value: locationData.address } });
    }
    if (onPlaceSelected) {
      onPlaceSelected(locationData);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setSuggestions([]);
      if (inputValue && inputValue.trim().length >= 3) {
        setIsModalOpen(true);
      }
    }
  };

  // When customer leaves the address input field (onBlur)
  const handleBlur = () => {
    // Proactively verify without popping up annoying full modal
    if (inputValue && inputValue.trim().length >= 6 && !hasVerifiedCoords) {
      autoPinLocation(inputValue.trim());
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`${className} ${showMapButton ? "pr-28" : "pr-8"}`}
          style={{
            ...style,
            borderColor: hasVerifiedCoords ? "#16a34a" : (style?.borderColor || "#D1D5DB"),
          }}
          required={required}
          disabled={disabled}
        />

        {/* Verification Status Badge & Map Pin Trigger Button */}
        <div className="absolute right-2 flex items-center gap-1.5 z-10">
          {hasVerifiedCoords && (
            <span 
              className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5" 
              title="Doorstep GPS Coordinates Verified"
            >
              ✓ Pinned
            </span>
          )}

          {showMapButton && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1 transition whitespace-nowrap cursor-pointer ${
                hasVerifiedCoords 
                  ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 animate-pulse"
              }`}
              title="Pin your exact doorstep location on map"
            >
              <span>📍</span>
              <span>{hasVerifiedCoords ? "Adjust Pin" : "Pin Map"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Proactive Pin & Verification Notification Bar */}
      {hasVerifiedCoords ? (
        <div className="mt-1.5 flex items-center justify-between px-3 py-1.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 animate-fadeIn">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-700 font-bold">✓ Location Pinned</span>
            <span className="text-emerald-700/80">
              {pinnedDetails?.city ? `(${pinnedDetails.city}, ${pinnedDetails.state})` : "Doorstep GPS verified"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-emerald-800 hover:text-emerald-950 font-bold underline transition ml-2 cursor-pointer"
          >
            Change Pin on Map
          </button>
        </div>
      ) : isSearching ? (
        <div className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-600">
          <span className="animate-spin text-emerald-700">⟳</span>
          <span>Searching map &amp; detecting delivery zone…</span>
        </div>
      ) : inputValue && inputValue.trim().length >= 5 ? (
        <div className="mt-1.5 flex items-center justify-between px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 animate-fadeIn">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="animate-bounce">📍</span>
            <span>Click to pin your doorstep for dispatch routing</span>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-2.5 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-md shadow-xs transition ml-2 cursor-pointer"
          >
            Pin on Map →
          </button>
        </div>
      ) : null}

      {/* Live Suggestions Dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 z-[1000] overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-emerald-50 border-b border-gray-50 last:border-0 flex items-start gap-2 transition cursor-pointer"
              onClick={() => handleSelectSuggestion(item)}
            >
              <span className="text-sm mt-0.5">📍</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{item.display_name}</div>
                <div className="text-[10px] text-gray-500">
                  {item.city ? `${item.city}, ` : ''}{item.state} {item.reason ? `• ${item.reason}` : ''}
                </div>
              </div>
            </button>
          ))}
          <button
            type="button"
            className="w-full py-2 bg-emerald-50 text-emerald-800 font-bold text-xs text-center border-t border-emerald-100 hover:bg-emerald-100 transition flex items-center justify-center gap-1 cursor-pointer"
            onClick={() => {
              setSuggestions([]);
              setIsModalOpen(true);
            }}
          >
            <span>🗺️ Don't see exact building? Pin on Map</span>
          </button>
        </div>
      )}

      {/* Interactive Map Modal */}
      <VerifiedLocationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLocationConfirmed={handleLocationConfirmed}
        initialAddress={inputValue}
        initialLat={initialLat}
        initialLng={initialLng}
      />
    </div>
  );
}
