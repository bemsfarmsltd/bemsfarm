import React, { useState, useRef, useEffect } from "react";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";

const LIBRARIES = ["places"];
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  onPlaceSelected, 
  placeholder = "Enter your street address", 
  className, 
  style,
  required,
  disabled 
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const [inputValue, setInputValue] = useState(value || "");
  const autocompleteRef = useRef(null);

  // Sync internal value if external value changes (e.g. form reset or default address loaded)
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  const handlePlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.name + (place.formatted_address ? ", " + place.formatted_address : "");
        // formatted_address usually contains the name, but sometimes it doesn't. 
        // A safer bet is just using formatted_address if available.
        const finalAddress = place.formatted_address || place.name;
        
        let city = "";
        let state = "";
        if (place.address_components) {
          for (let component of place.address_components) {
            const types = component.types;
            if (types.includes("locality") || types.includes("sublocality")) {
              if (!city) city = component.long_name;
            }
            if (types.includes("administrative_area_level_1")) {
              state = component.long_name;
            }
          }
        }
        
        setInputValue(finalAddress);
        // Call the regular onChange to update the standard input text in parent state
        if (onChange) {
          onChange({ target: { value: finalAddress } });
        }
        // Call onPlaceSelected to update city, state, lat, lng
        if (onPlaceSelected) {
          onPlaceSelected({ address: finalAddress, city, state, latitude: lat, longitude: lng });
        }
      }
    }
  };

  const handleChange = (e) => {
    setInputValue(e.target.value);
    if (onChange) {
      onChange(e);
    }
  };

  if (loadError) {
    console.error("Google Maps API failed to load", loadError);
  }

  // Fallback to standard input if API Key is missing or script fails to load
  if (!isLoaded || !API_KEY || loadError) {
    return (
      <input
        type="text"
        value={value !== undefined ? value : inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        style={style}
        required={required}
        disabled={disabled}
      />
    );
  }

  return (
    <Autocomplete
      onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
      onPlaceChanged={handlePlaceChanged}
      options={{ componentRestrictions: { country: "ng" } }}
    >
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        style={style}
        required={required}
        disabled={disabled}
      />
    </Autocomplete>
  );
}
