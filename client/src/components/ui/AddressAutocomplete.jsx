import React, { useState, useRef, useEffect } from "react";
import VerifiedLocationModal from "./VerifiedLocationModal";
import api from "../../services/api";

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  onPlaceSelected, 
  placeholder = "Enter your street address or pin on map", 
  className = "", 
  style,
  required,
  disabled,
  initialLat = null,
  initialLng = null,
  showMapButton = true,
}) {
  const [inputValue, setInputValue] = useState(value || "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasVerifiedCoords, setHasVerifiedCoords] = useState(Boolean(initialLat && initialLng));
  const wrapperRef = useRef(null);

  // Sync internal value if external value changes
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

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

  // Free OpenStreetMap Nominatim search debounced
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputValue(text);
    setHasVerifiedCoords(false);

    if (onChange) {
      onChange(e);
    }

    if (!text || text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get("/locations/search", { params: { q: text } });
        setSuggestions(res.data?.results || []);
      } catch (err) {
        // silent catch
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  };

  const handleSelectSuggestion = async (suggestion) => {
    const address = suggestion.display_name;
    setInputValue(address);
    setSuggestions([]);
    setHasVerifiedCoords(true);

    if (onChange) {
      onChange({ target: { value: address } });
    }

    // Verify zone on backend
    try {
      const res = await api.post("/locations/verify", {
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        address,
        city: suggestion.city,
        state: suggestion.state,
      });

      if (onPlaceSelected) {
        onPlaceSelected({
          address,
          street_address: address,
          city: res.data?.city || suggestion.city,
          state: res.data?.state || suggestion.state,
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
          zone_id: res.data?.zone?.zone_id || "ZONE001",
          zone_name: res.data?.zone?.zone_name,
          delivery_fee: res.data?.zone?.delivery_fee || 1000,
          verified: true,
        });
      }
    } catch (e) {
      if (onPlaceSelected) {
        onPlaceSelected({
          address,
          city: suggestion.city,
          state: suggestion.state,
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
          verified: true,
        });
      }
    }
  };

  const handleLocationConfirmed = (locationData) => {
    setInputValue(locationData.address);
    setHasVerifiedCoords(true);

    if (onChange) {
      onChange({ target: { value: locationData.address } });
    }
    if (onPlaceSelected) {
      onPlaceSelected(locationData);
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`${className} ${showMapButton ? "pr-24" : "pr-8"}`}
          style={style}
          required={required}
          disabled={disabled}
        />

        {/* Verification Status Badge / Clear Icon */}
        <div className="absolute right-2 flex items-center gap-1.5 z-10">
          {hasVerifiedCoords && (
            <span 
              className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5" 
              title="GPS Coordinates Verified"
            >
              ✓
            </span>
          )}

          {showMapButton && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-2.5 py-1 text-[11px] font-semibold bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 rounded-lg shadow-sm flex items-center gap-1 transition whitespace-nowrap"
              title="Pin your exact location on the map"
            >
              <span>📍</span>
              <span className="hidden sm:inline">Pin Map</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Suggestions Dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 z-[1000] overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-green-50 border-b border-gray-50 last:border-0 flex items-start gap-2 transition"
              onClick={() => handleSelectSuggestion(item)}
            >
              <span className="text-sm mt-0.5">📍</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{item.display_name}</div>
                <div className="text-[10px] text-gray-500">{item.city ? `${item.city}, ` : ''}{item.state}</div>
              </div>
            </button>
          ))}
          <button
            type="button"
            className="w-full py-2 bg-green-50 text-green-800 font-bold text-xs text-center border-t border-green-100 hover:bg-green-100 transition flex items-center justify-center gap-1"
            onClick={() => {
              setSuggestions([]);
              setIsModalOpen(true);
            }}
          >
            <span>🗺️ Don't see your address? Pin on Map</span>
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
